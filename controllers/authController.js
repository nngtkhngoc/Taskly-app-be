import bcrypt from "bcryptjs";

import generateTokenAndSetCookie from "../utils/generateTokenAndSetCookie.js";

import { prisma } from "../config/db.js";

import { signUpValidator } from "../validation/userValidation.js";

export const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Tổng số user
    const totalItems = await prisma.user.count();

    // Lấy user
    const user = await prisma.user.findMany({
      include: {
        badges: true,
        notifications: true,
        tasks: { include: { subtasks: true } },
        daily_task_record: { inclue: { tasks: true } },
        level: true,
      },
      skip,
      take,
    });

    return res.status(200).json({
      success: true,
      data: user,
      totalItems,
      totalPages: Math.ceil(totalItems / take),
      currentPage: parseInt(page),
    });
  } catch (error) {
    console.error("Error get all user:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

export const getUser = async (req, res) => {
  console.log(req);
  const id = req.id;
  console.log("User ID:", id);
  try {
    const user = await prisma.user.findUnique({
      omit: {
        password: true,
      },
      where: { id },
      include: {
        badges: true,
        notifications: true,
        tasks: { include: { subtasks: true } },
        daily_task_record: { include: { tasks: true } },
        level: true,
      },
    });

    if (user) {
      return res.status(200).json({ success: true, data: user });
    }

    return res.status(404).json({ success: false, message: "User not found" });
  } catch (error) {
    console.log("Error get user: ", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

export const getUserById = async (req, res) => {
  const id = req.params.id;
  try {
    const user = await prisma.user.findUnique({
      omit: {
        password: true,
      },
      where: { id },
      include: {
        badges: true,
        notifications: true,
        tasks: { include: { subtasks: true } },
        daily_task_record: { include: { completed_tasks: true } },
        level: true,
      },
    });

    if (user) {
      return res.status(200).json({ success: true, data: user });
    }

    return res.status(404).json({ success: false, message: "User not found" });
  } catch (error) {
    console.log("Error get user: ", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

export const signUp = async (req, res) => {
  const data = req.body;
  console.log(data);

  try {
    if (!req.body || Object.keys(req.body).length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Please fill in enough fields." });
    }

    await signUpValidator.validateAsync(data);

    const checkEmail = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (checkEmail) {
      return res
        .status(409)
        .json({ success: false, message: "Email existed." });
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const newUser = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
      },
      include: {
        badges: true,
        notifications: true,
        tasks: { include: { subtasks: true } },
        daily_task_record: { include: { completed_tasks: true } },
        level: true,
      },
    });

    generateTokenAndSetCookie(newUser.id, res);

    return res
      .status(200)
      .json({ success: true, message: "Sign up sucesfully", data: newUser });
  } catch (error) {
    if (error.isJoi) {
      return res.status(400).json({
        success: false,
        message: error.details.map((err) => err.message),
      });
    }
    console.log("Error signing up: ", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

export const signIn = async (req, res) => {
  const { email, password } = req.body;
  try {
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please fill in enough fields.",
      });
    }

    const user = await prisma.user.findFirst({
      where: {
        email: email,
      },
      include: {
        badges: true,
        notifications: true,
        tasks: { include: { subtasks: true } },
        daily_task_record: { include: { tasks: true } },
        level: true,
      },
    });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not founded." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(406)
        .json({ success: false, message: "Wrong password." });
    }

    generateTokenAndSetCookie(user.id, res);

    return res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    if (error.isJoi) {
      return res.status(400).json({
        success: false,
        message: error.details.map((err) => err.message),
      });
    }
    console.log("Error signing up: ", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

export const signOut = async (req, res) => {
  try {
    res.cookie("jwt", "", { maxAge: 0 });

    return res
      .status(200)
      .json({ success: true, message: "Sign out successfully" });
  } catch (error) {
    console.log("Error sign out:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};
