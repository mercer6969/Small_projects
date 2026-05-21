require("dotenv").config();

const express = require("express");
const cors = require("cors");
const initDB = require("./database");

const app = express();

app.use(cors());
app.use(express.json());

async function start() {
  const db = await initDB();

  app.get("/", (req, res) => {
    res.send("TaskFlow API Running");
  });

  app.use("/api/auth", require("./routes/auth")(db));
  app.use("/api/tasks", require("./routes/tasks")(db));

  const PORT = process.env.PORT || 5000;

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start();