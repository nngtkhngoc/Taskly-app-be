import { prisma } from "../config/db.js";
import {
  createTaskValidator,
  updateTaskValidator,
} from "../validation/taskValidation.js";
import moment from "moment";

export const getTasksByUserId = async (req, res) => {
  const { id } = req;
  console.log("get task: ", id);
  try {
    const tasks = await prisma.task.findMany({
      where: { user_id: id },
      include: { subtasks: true, reminder: true },
    });
    return res.status(200).json({
      data: tasks,
    });
  } catch (error) {
    console.log(error.toString());
    res.status(500).json({ error: "Failed to retrieve tasks" });
  }
};

export const getTaskById = async (req, res) => {
  const { id } = req.params;
  try {
    const tasks = await prisma.task.findUnique({
      where: { id },
      include: { subtasks: true, reminder: true },
    });
    return res.status(200).json({
      data: tasks,
    });
  } catch (error) {
    console.log(error.toString());
    res.status(500).json({ error: "Failed to retrieve tasks" });
  }
};

export const createTask = async (req, res) => {
  const { name, note, category, is_important, is_urgent, deadline } = req.body;
  const { id } = req;

  try {
    if (!req.body || Object.keys(req.body).length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No data provided" });
    }

    await createTaskValidator.validateAsync(req.body);

    const parsedDeadline = deadline
      ? moment(deadline, "YYYY-MM-DD").add(1, "days").toDate()
      : null;

    console.log(parsedDeadline);
    // const user = await prisma.user.findUnique({ id });

    const newTask = await prisma.task.create({
      data: {
        user_id: id,
        name,
        note,
        category,
        is_important,
        is_urgent,
        deadline: parsedDeadline,
      },
    });

    return res.status(201).json({ success: true, data: newTask });
  } catch (error) {
    console.log("Error creating task:", error);
    if (error.isJoi) {
      return res.status(400).json({
        success: false,
        message: error.details.map((err) => err.message),
      });
    }

    return res
      .status(500)
      .json({ success: false, error: "Internal Server Error" });
  }
};
export const deleteTask = async (req, res) => {
  const id = req.params.id;
  try {
    const checkTask = await prisma.task.findUnique({
      where: { id },
    });

    if (!checkTask) {
      return res
        .status(404)
        .json({ success: false, message: "Task not found" });
    }

    await prisma.task.delete({ where: { id } });

    return res
      .status(200)
      .json({ success: true, message: "Delete task successfully" });
  } catch (error) {
    console.log("Error delete unit:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

export const updateTask = async (req, res) => {
  const id = req.params.id;
  const { name, note, category, is_important, is_urgent, deadline } = req.body;

  try {
    if (!req.body || Object.keys(req.body).length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No data provided" });
    }

    await updateTaskValidator.validateAsync(req.body);

    const oldTask = await prisma.task.findUnique({
      where: { id },
    });
    if (!oldTask) {
      return res
        .status(404)
        .json({ success: false, message: "Task not found" });
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        name: name ?? oldTask.name,
        note: note ?? oldTask.note,
        category: category ?? oldTask.category,
        is_important: is_important ?? oldTask.is_important,
        is_urgent: is_urgent ?? oldTask.is_urgent,
        deadline: deadline
          ? moment(deadline, "YYYY-MM-DD").add(1, "days").toDate()
          : oldTask.deadline,
      },
    });

    return res.status(200).json({ success: true, data: updatedTask });
  } catch (error) {
    if (error.isJoi) {
      return res.status(400).json({
        success: false,
        message: error.details.map((err) => err.message),
      });
    }

    console.error("Error updating task:", error);
    return res
      .status(500)
      .json({ success: false, error: "Internal Server Error" });
  }
};

async function getOrCreateDailyRecord(userId, date) {
  return prisma.dailyTaskRecord.upsert({
    where: {
      user_id_date: { user_id: userId, date },
    },
    update: {},
    create: {
      user_id: userId,
      date: date,
    },
  });
}

// Giả sử mỗi task completed +10 XP
const TASK_XP = 10;

async function addXpAndCheckLevel(userId) {
  // Lấy user cùng level hiện tại
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { level: true },
  });

  if (!user) throw new Error("User not found");

  let newXp = user.xp + TASK_XP;
  let currentLevel = user.level;

  console.log("new XP", newXp);
  console.log("current level", currentLevel);

  if (!currentLevel) {
    currentLevel = await prisma.level.findFirst({
      orderBy: { xp_required: "asc" },
    });
  }

  // Tìm level tiếp theo (xp_required > currentLevel.xp_required)
  const nextLevel = await prisma.level.findFirst({
    where: { name: { gt: currentLevel.name } },
    orderBy: { name: "asc" },
  });

  console.log("next level", nextLevel);
  let newLevelId = user.levelId;
  console.log("user level", user.levelId);

  // Nếu có level tiếp theo và xp vượt ngưỡng
  if (nextLevel && newXp >= nextLevel.xp_required) {
    newLevelId = nextLevel.id;
  }

  // Update user
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      xp: newXp,
      levelId: newLevelId,
    },
    include: { level: true },
  });

  return updatedUser;
}

export const markTaskCompleted = async (req, res) => {
  const { id } = req;
  const { taskId } = req.params;

  try {
    const parsedDate = new Date();
    parsedDate.setHours(0, 0, 0, 0);

    await getOrCreateDailyRecord(id, parsedDate);

    await prisma.task.update({
      where: {
        id: taskId,
      },
      data: {
        status: "COMPLETED",
      },
    });
    const updatedRecord = await prisma.dailyTaskRecord.update({
      where: {
        user_id_date: { user_id: id, date: parsedDate },
      },
      data: {
        completed_tasks: { connect: { id: taskId } },
      },
      include: { completed_tasks: true },
    });

    const updatedUser = await addXpAndCheckLevel(id);

    return res.status(200).json({
      success: true,
      data: {
        dailyRecord: updatedRecord,
        user: updatedUser,
      },
    });
  } catch (error) {
    console.error("Error marking task completed:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

async function minusXpAndCheckLevel(userId) {
  // Lấy user cùng level hiện tại
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { level: true },
  });

  if (!user) throw new Error("User not found");

  let newXp = user.xp - TASK_XP;
  if (newXp < 0) newXp = 0;

  // Nếu user chưa có level thì set level 1 (giả sử level thấp nhất có xp_required = 0)
  let currentLevel = user.level;
  if (!currentLevel) {
    currentLevel = await prisma.level.findFirst({
      orderBy: { xp_required: "asc" },
    });
  }

  // Lấy level thấp nhất thỏa điều kiện xp_required <= newXp
  const newLevel = await prisma.level.findFirst({
    where: { xp_required: { lte: newXp } },
    orderBy: { xp_required: "desc" },
  });

  let newLevelId = newLevel ? newLevel.id : currentLevel.id;

  // Update user
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      xp: newXp,
      levelId: newLevelId,
    },
    include: { level: true },
  });

  return updatedUser;
}

async function unmarkTaskByTaskId(userId, taskId) {
  const record = await prisma.dailyTaskRecord.findFirst({
    where: {
      user_id: userId,
      completed_tasks: { some: { id: taskId } },
    },
  });

  if (!record) {
    throw new Error("No record found for this taskId and user");
  }

  return prisma.dailyTaskRecord.update({
    where: {
      user_id_date: { user_id: record.user_id, date: record.date },
    },
    data: {
      completed_tasks: { disconnect: { id: taskId } },
    },
    include: { completed_tasks: true },
  });
}

export const unmarkTaskCompleted = async (req, res) => {
  const { id } = req;
  const { taskId } = req.params;
  try {
    const updatedRecord = await unmarkTaskByTaskId(id, taskId);
    const updatedUser = await minusXpAndCheckLevel(id);

    return res.status(200).json({
      success: true,
      data: { updatedRecord, updatedUser },
    });
  } catch (error) {
    console.error("Error unmarkTaskById:", error.message);
    if (error.message.includes("No record found")) {
      return res.status(404).json({ success: false, message: error.message });
    }
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

export const getDailyRecordForUser = async (req, res) => {
  try {
    const { id } = req;
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({ error: "Missing from/to parameters" });
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return res.status(400).json({ error: "Invalid date format" });
    }

    const records = await prisma.dailyTaskRecord.findMany({
      where: {
        user_id: id,
        date: {
          gte: fromDate,
          lte: toDate,
        },
      },
      include: { completed_tasks: true },
      orderBy: { date: "asc" },
    });

    return res.json(records);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};
