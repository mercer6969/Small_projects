app.use(cors());
app.use(express.json({ limit: "16kb" })); // ← add this line
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const initDB = require("./database");

const app = express();

// ── Security headers ──────────────────────────────────────────
app.use(helmet());

// ── CORS ──────────────────────────────────────────────────────
app.use(cors());

// ── Global rate limit ─────────────────────────────────────────
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
}));

// ── Auth rate limit (stricter) ────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Too many auth attempts, please try again later." },
});

async function start() {
  if (!process.env.JWT_SECRET) {
    console.error("FATAL: JWT_SECRET is not set in .env");
    process.exit(1);
  }

  const db = await initDB();

  app.get("/", (req, res) => {
    res.json({ status: "TaskFlow API running" });
  });

  app.use("/api/auth", authLimiter, require("./routes/auth")(db));
  app.use("/api/tasks", require("./routes/tasks")(db));

  // ── 404 handler ───────────────────────────────────────────
  app.use((req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  // ── Error handler ─────────────────────────────────────────
  app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
    console.error(err.stack);
    res.status(500).json({ error: "Internal server error" });
  });

  const PORT = parseInt(process.env.PORT, 10) || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start();