const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const USERNAME_RE = /^[a-zA-Z0-9_]{3,32}$/;
const MIN_PASSWORD_LEN = 8;
const MAX_PASSWORD_LEN = 128;

module.exports = function (db) {
  const router = express.Router();

  // ── Register ───────────────────────────────────────────────
  router.post("/register", async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: "Missing fields" });
      }

      if (!USERNAME_RE.test(username)) {
        return res.status(400).json({
          error: "Username must be 3-32 characters (letters, numbers, underscores only)",
        });
      }

      if (password.length < MIN_PASSWORD_LEN) {
        return res.status(400).json({
          error: `Password must be at least ${MIN_PASSWORD_LEN} characters`,
        });
      }

      if (password.length > MAX_PASSWORD_LEN) {
        return res.status(400).json({ error: "Password too long" });
      }

      const existing = await db.get(
        "SELECT id FROM users WHERE username = ?",
        [username]
      );

      if (existing) {
        return res.status(409).json({ error: "Username already exists" });
      }

      // Cost factor 12 — good balance of security vs latency
      const hashed = await bcrypt.hash(password, 12);

      const result = await db.run(
        "INSERT INTO users (username, password) VALUES (?, ?)",
        [username, hashed]
      );

      const token = jwt.sign(
        { id: result.lastID, username },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.status(201).json({ token, username });
    } catch (err) {
      console.error("Register error:", err);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  // ── Login ──────────────────────────────────────────────────
  router.post("/login", async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: "Missing fields" });
      }

      // Truncate to avoid bcrypt DoS (bcrypt ignores chars > 72 anyway)
      const passwordTruncated = String(password).slice(0, MAX_PASSWORD_LEN);

      const user = await db.get(
        "SELECT * FROM users WHERE username = ?",
        [username]
      );

      // Always run bcrypt to prevent timing-based username enumeration
      const dummyHash = "$2a$12$invalidhashusedfortimingprotectiononly000000000000000000";
      const valid = user
        ? await bcrypt.compare(passwordTruncated, user.password)
        : await bcrypt.compare(passwordTruncated, dummyHash).then(() => false);

      if (!user || !valid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const token = jwt.sign(
        { id: user.id, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.json({ token, username: user.username });
    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ error: "Login failed" });
    }
  });

  return router;
};