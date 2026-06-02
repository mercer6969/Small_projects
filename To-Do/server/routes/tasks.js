const express = require("express");
const auth = require("../middleware/auth");

const VALID_CATEGORIES = ["Work", "Personal", "Health", "Learning", "Other"];
const VALID_PRIORITIES = ["low", "medium", "high"];
const MAX_TITLE_LEN = 200;
const MAX_DESC_LEN = 2000;

function validateTaskFields(body) {
  const { title, category, priority, dueDate } = body;

  if (title !== undefined) {
    if (typeof title !== "string" || !title.trim()) {
      return "Title is required";
    }
    if (title.length > MAX_TITLE_LEN) {
      return `Title must be ${MAX_TITLE_LEN} characters or fewer`;
    }
  }

  if (category !== undefined && !VALID_CATEGORIES.includes(category)) {
    return "Invalid category";
  }

  if (priority !== undefined && !VALID_PRIORITIES.includes(priority)) {
    return "Invalid priority";
  }

  if (dueDate !== undefined && dueDate !== null && dueDate !== "") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      return "Invalid date format (expected YYYY-MM-DD)";
    }
  }

  return null;
}

module.exports = function (db) {
  const router = express.Router();

  // ── GET all tasks ──────────────────────────────────────────
  router.get("/", auth, async (req, res) => {
    try {
      const tasks = await db.all(
        "SELECT * FROM tasks WHERE userId = ? ORDER BY createdAt DESC",
        [req.user.id]
      );

      const formatted = tasks.map((task) => ({
        ...task,
        completed: Boolean(task.completed),
      }));

      res.json(formatted);
    } catch (err) {
      console.error("Get tasks error:", err);
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  // ── CREATE task ────────────────────────────────────────────
  router.post("/", auth, async (req, res) => {
    try {
      const { title, description, category, priority, dueDate } = req.body;

      if (!title || !title.trim()) {
        return res.status(400).json({ error: "Title is required" });
      }

      const validationError = validateTaskFields({ title, category, priority, dueDate });
      if (validationError) {
        return res.status(400).json({ error: validationError });
      }

      const safeCategory = VALID_CATEGORIES.includes(category) ? category : "Personal";
      const safePriority = VALID_PRIORITIES.includes(priority) ? priority : "medium";
      const safeDescription = typeof description === "string"
        ? description.slice(0, MAX_DESC_LEN)
        : "";
      const safeDueDate = dueDate && /^\d{4}-\d{2}-\d{2}$/.test(dueDate) ? dueDate : null;

      const createdAt = Date.now();

      const result = await db.run(
        `INSERT INTO tasks
        (userId, title, description, category, priority, dueDate, completed, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          req.user.id,
          title.trim().slice(0, MAX_TITLE_LEN),
          safeDescription,
          safeCategory,
          safePriority,
          safeDueDate,
          0,
          createdAt,
        ]
      );

      const task = await db.get("SELECT * FROM tasks WHERE id = ?", [result.lastID]);
      task.completed = Boolean(task.completed);
      res.status(201).json(task);
    } catch (err) {
      console.error("Create task error:", err);
      res.status(500).json({ error: "Failed to create task" });
    }
  });

  // ── DELETE completed tasks (must be before /:id) ───────────
  router.delete("/completed/all", auth, async (req, res) => {
    try {
      const result = await db.run(
        "DELETE FROM tasks WHERE userId = ? AND completed = 1",
        [req.user.id]
      );

      res.json({ success: true, deleted: result.changes });
    } catch (err) {
      console.error("Clear completed error:", err);
      res.status(500).json({ error: "Failed to clear completed tasks" });
    }
  });

  // ── UPDATE task ────────────────────────────────────────────
  router.put("/:id", auth, async (req, res) => {
    try {
      const taskId = parseInt(req.params.id, 10);
      if (!Number.isInteger(taskId) || taskId <= 0) {
        return res.status(400).json({ error: "Invalid task ID" });
      }

      const task = await db.get(
        "SELECT * FROM tasks WHERE id = ? AND userId = ?",
        [taskId, req.user.id]
      );

      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      const validationError = validateTaskFields(req.body);
      if (validationError) {
        return res.status(400).json({ error: validationError });
      }

      // Explicit field handling — allow clearing description/dueDate with ""
      const updatedTask = {
        title: req.body.title !== undefined
          ? req.body.title.trim().slice(0, MAX_TITLE_LEN) || task.title
          : task.title,
        description: req.body.description !== undefined
          ? String(req.body.description).slice(0, MAX_DESC_LEN)
          : task.description,
        category: req.body.category !== undefined ? req.body.category : task.category,
        priority: req.body.priority !== undefined ? req.body.priority : task.priority,
        dueDate: req.body.dueDate !== undefined ? (req.body.dueDate || null) : task.dueDate,
        completed: req.body.completed !== undefined
          ? Boolean(req.body.completed)
          : Boolean(task.completed),
      };

      await db.run(
        `UPDATE tasks
        SET title = ?, description = ?, category = ?, priority = ?, dueDate = ?, completed = ?
        WHERE id = ?`,
        [
          updatedTask.title,
          updatedTask.description,
          updatedTask.category,
          updatedTask.priority,
          updatedTask.dueDate,
          updatedTask.completed ? 1 : 0,
          taskId,
        ]
      );

      const finalTask = await db.get("SELECT * FROM tasks WHERE id = ?", [taskId]);
      finalTask.completed = Boolean(finalTask.completed);
      res.json(finalTask);
    } catch (err) {
      console.error("Update task error:", err);
      res.status(500).json({ error: "Failed to update task" });
    }
  });

  // ── DELETE task ────────────────────────────────────────────
  router.delete("/:id", auth, async (req, res) => {
    try {
      const taskId = parseInt(req.params.id, 10);
      if (!Number.isInteger(taskId) || taskId <= 0) {
        return res.status(400).json({ error: "Invalid task ID" });
      }

      const result = await db.run(
        "DELETE FROM tasks WHERE id = ? AND userId = ?",
        [taskId, req.user.id]
      );

      if (result.changes === 0) {
        return res.status(404).json({ error: "Task not found" });
      }

      res.json({ success: true });
    } catch (err) {
      console.error("Delete task error:", err);
      res.status(500).json({ error: "Failed to delete task" });
    }
  });

  return router;
};