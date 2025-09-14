import express from "express";

import {
  getTasksByUserId,
  createTask,
  deleteTask,
  updateTask,
  markTaskCompleted,
  unmarkTaskCompleted,
  getDailyRecordForUser,
  getTaskById,
  updateTaskPriority,
} from "../controllers/taskController.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

router
  .route("/")
  .get(verifyToken, getTasksByUserId)
  .post(verifyToken, createTask);

router
  .route("/:id")
  .get(verifyToken, getTaskById)
  .put(verifyToken, updateTask)
  .delete(verifyToken, deleteTask);

router
  .route("/completed/:taskId")
  .post(verifyToken, markTaskCompleted)
  .delete(verifyToken, unmarkTaskCompleted);

router.route("/record").get(verifyToken, getDailyRecordForUser);

router.route("/priority/:taskId").put(verifyToken, updateTaskPriority);

export default router;
