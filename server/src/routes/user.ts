import express from "express";
import UserController from "../controllers/user";
import verifyToken from "../utils/jwt";
const router = express.Router();

// Create a new user
router.post("/", verifyToken, UserController.createUser);

// Reset password
router.post("/reset-password/:id", verifyToken, UserController.resetPassword);

// Get all users
router.get("/", verifyToken, UserController.getAllUsers);

// Get all users summary
router.get("/summary", verifyToken, UserController.getUsersSummary);

// Get user by ID
router.get("/:id", verifyToken, UserController.getUserById);

// Update user
router.patch("/:id", verifyToken, UserController.updateUser);

// Change password
router.patch("/:id/password", verifyToken, UserController.changePassword);

// Soft delete user
router.delete("/:id/soft", verifyToken, UserController.softDeleteUser);

// Restore user
router.patch("/:id/restore", verifyToken, UserController.restoreUser);

// Delete user
router.delete("/:id", verifyToken, UserController.deleteUser);

export default router;
