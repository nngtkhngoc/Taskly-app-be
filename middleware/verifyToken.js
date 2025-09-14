import jwt from "jsonwebtoken";
import { prisma } from "../config/db.js";

export const verifyToken = async (req, res, next) => {
  const token = req.cookies.jwt;
  if (!token) return res.status(401).send("Access Denied");

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    if (!verified) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const user = await prisma.user.findUnique({
      where: { id: verified.id },
      include: {
        badges: true,
        notifications: true,
        tasks: { include: { subtasks: true } },
        daily_task_record: true,
        level: true,
      },
    });

    req.id = user.id;
    req.role = user.role;

    next();
  } catch (err) {
    return res.status(500).send("Internal Server Error");
  }
};
