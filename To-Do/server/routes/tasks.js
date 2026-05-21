const express = require("express");
const auth = require("../middleware/auth");

module.exports = function (db) {
  const router = express.Router();

  // GET ALL TASKS
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
      res.status(500).json({ error: err.message });
    }
  });

  // CREATE TASK
  router.post("/", auth, async (req, res) => {
    try {
      const {
        title,
        description,
        category,
        priority,
        dueDate,
      } = req.body;

      const createdAt = Date.now();

      const result = await db.run(
        `INSERT INTO tasks
        (userId, title, description, category, priority, dueDate, completed, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          req.user.id,
          title,
          description,
          category,
          priority,
          dueDate,
          0,
          createdAt,
        ]
      );

      const task = await db.get(
        "SELECT * FROM tasks WHERE id = ?",
        [result.lastID]
      );

      task.completed = Boolean(task.completed);

      res.json(task);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // UPDATE TASK
  router.put("/:id", auth, async (req, res) => {
    try {
      const task = await db.get(
        "SELECT * FROM tasks WHERE id = ? AND userId = ?",
        [req.params.id, req.user.id]
      );

      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      const updatedTask = {
        title: req.body.title || task.title,
        description: req.body.description || task.description,
        category: req.body.category || task.category,
        priority: req.body.priority || task.priority,
        dueDate: req.body.dueDate || task.dueDate,
        completed:
          req.body.completed !== undefined
            ? req.body.completed
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
          req.params.id,
        ]
      );

      const finalTask = await db.get(
        "SELECT * FROM tasks WHERE id = ?",
        [req.params.id]
      );

      finalTask.completed = Boolean(finalTask.completed);

      res.json(finalTask);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE TASK
  router.delete("/:id", auth, async (req, res) => {
    try {
      await db.run(
        "DELETE FROM tasks WHERE id = ? AND userId = ?",
        [req.params.id, req.user.id]
      );

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE COMPLETED TASKS
  router.delete("/completed/all", auth, async (req, res) => {
    try {
      const result = await db.run(
        "DELETE FROM tasks WHERE userId = ? AND completed = 1",
        [req.user.id]
      );

      res.json({
        success: true,
        deleted: result.changes,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};