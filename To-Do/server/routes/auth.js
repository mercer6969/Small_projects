const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

module.exports = function(db) {
  const router = express.Router();

  router.post("/register", async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const existing = await db.get(
      "SELECT * FROM users WHERE username = ?",
      [username]
    );

    if (existing) {
      return res.status(400).json({ error: "Username already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const result = await db.run(
      "INSERT INTO users (username, password) VALUES (?, ?)",
      [username, hashed]
    );

    const token = jwt.sign(
      { id: result.lastID, username },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token, username });
  });

  router.post("/login", async (req, res) => {
    const { username, password } = req.body;

    const user = await db.get(
      "SELECT * FROM users WHERE username = ?",
      [username]
    );

    if (!user) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token, username: user.username });
  });

  return router;
};