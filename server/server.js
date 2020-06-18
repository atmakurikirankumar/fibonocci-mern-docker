const keys = require("./keys");
const express = require("express");
const cors = require("cors");

const app = new express();

app.use(express.json());
app.use(cors());

const { pgUser, pgHost, pgDatabase, pgPassword, pgPort, redisHost, redisPort } = keys;

//POSTGRES SETUP
const { Pool } = require("pg");
const pgClient = new Pool({
  user: pgUser,
  host: pgHost,
  database: pgDatabase,
  password: pgPassword,
  port: pgPort,
});

pgClient.on("connect", () => {
  pgClient.query("CREATE TABLE IF NOT EXISTS values (number INT)").catch((err) => console.log(err));
});

//REDIS SETUP
const redis = require("redis");
const redisClient = redis.createClient({
  host: redisHost,
  port: redisPort,
  retry_strategy: () => 1000,
});
const redisPublisher = redisClient.duplicate();

// Express route handlers
app.get("/", (req, res) => {
  res.send("Hi");
});

app.get("/values/all", async (req, res) => {
  const values = await pgClient.query("SELECT * FROM values");
  res.send(values.rows);
});

app.get("/values/current", async (req, res) => {
  redisClient.hgetall("values", (err, values) => {
    res.send(values);
  });
});

app.post("/values", async (req, res) => {
  const index = req.body.index;
  if (parseInt(index) > 40) {
    return res.status(422).send("Index too high. please submit less than or equal to 40");
  }
  redisClient.hset("values", index, "Nothing Yet!!");
  redisPublisher.publish("insert", index);
  pgClient.query("INSERT INTO values (number) VALUES($1)", [index]);
  res.send({ working: true });
});

app.listen(5000, () => console.log(`App is running on port: 5000`));
