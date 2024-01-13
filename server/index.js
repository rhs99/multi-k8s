const keys = require("./keys");

// Express App Setup
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Postgres Client Setup
const { Pool } = require("pg");
const pgClient = new Pool({
  user: keys.pgUser,
  host: keys.pgHost,
  database: keys.pgDatabase,
  password: keys.pgPassword,
  port: keys.pgPort
});


async function createTable() {
  const client = await pgClient.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS values (
        number INT
      );
    `);
    console.log("Table created successfully.");
  } catch (error) {
    console.error("Error creating table:", error);
  } finally {
    client.release();
  }
}

// Redis Client Setup
const redis = require("redis");
const redisClient = redis.createClient({
  host: keys.redisHost,
  port: keys.redisPort,
  retry_strategy: () => 1000,
});
const redisPublisher = redisClient.duplicate();

// Express route handlers

app.get("/api/create", async(req, res) => {
  await createTable();
  res.send("Created");
});

app.get("/api/values/all", async (req, res) => {
  const client = await pgClient.connect();
  try {
    const values = await pgClient.query("SELECT * from values");
    res.send(values.rows);
  } catch (error) {
    console.error("Error creatingtable:", error);
  } finally {
    client.release();
  }
});

app.get("/api/values/current", async (req, res) => {
  redisClient.hgetall("values", (err, values) => {
    res.send(values);
  });
});

app.post("/api/values", async (req, res) => {
  const index = req.body.index;

  if (parseInt(index) > 40) {
    return res.status(422).send("Index too high");
  }

  redisClient.hset("values", index, "Nothing yet!");
  redisPublisher.publish("insert", index);

  const client = await pgClient.connect();
  try {
    pgClient.query("INSERT INTO values(number) VALUES($1)", [index]);
  } catch (error) {
    console.error("Error creatingtable:", error);
  } finally {
    client.release();
  }

  res.send({ working: true });
});

app.listen(5000, (err) => {
  console.log("Listening");
});
