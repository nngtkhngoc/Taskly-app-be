import {
  signUp,
  signIn,
  getUser,
  signOut,
  getAllUsers,
  getUserById,
} from "../controllers/authController.js";
import { verifyToken } from "../middleware/verifyToken.js";
import express from "express";

const router = express.Router();

router.get("/me", verifyToken, getUser);
router.get("/", getAllUsers);
router.get("/:id", getUserById);
router.post("/sign-up", signUp);
router.post("/sign-in", signIn);
router.post("/sign-out", signOut);

export default router;
