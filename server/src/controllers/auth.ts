import bcrypt from "bcrypt";
import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET, NODE_ENV } from "../config/dotenv";
import { AuthLogModel } from "../models/auth";
import User from "../models/user";
import createError from "../utils/createError";

class AuthController {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { loginId, password } = req.body;

      if (!loginId || !password) {
        return next(createError(400, "Email and password are required"));
      }

      const user = await User.findOne({
        $or: [{ email: loginId }, { username: loginId }],
        isDeleted: { $ne: true },
      });

      if (!user) {
        return next(createError(404, "Invalid user or password"));
      }

      // Compare hashed passwords
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return next(createError(401, "Invalid password"));
      }

      if (user.isLocked) {
        return next(createError(403, "Account is locked"));
      }

      const { password: _, ...safeUser } = user.toObject();

      const tokenPayload = {
        _id: safeUser._id,
        username: safeUser.username,
        isLocked: safeUser.isLocked,
      };

      const token = jwt.sign(tokenPayload, JWT_SECRET, {
        expiresIn: "24h",
        algorithm: "HS256",
      });

      // Clear any existing session for this user
      await AuthLogModel.updateMany(
        { userID: user._id, action: "login" },
        { $set: { invalidated: true } },
      );

      // Create new login log entry
      await AuthLogModel.create({
        action: "login",
        userID: user._id,
        username: user.username,
        sessionID: token, // Using JWT token as sessionID
        invalidated: false,
      });

      const isProdution = NODE_ENV === "production";
      res.cookie("Access_Token", token, {
        httpOnly: true,
        secure: isProdution,
        sameSite: isProdution ? "none" : "lax",
        maxAge: 24 * 60 * 60 * 1000,
        path: "/",
      });

      res.status(200).json({
        success: true,
        data: safeUser,
      });
    } catch (error) {
      next(
        createError(
          500,
          error instanceof Error ? error.message : "Login failed",
        ),
      );
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.cookies.Access_Token;

      // Mark the session as invalidated
      await AuthLogModel.updateOne(
        { sessionID: token },
        { $set: { invalidated: true } },
      );

      // Create logout log entry
      await AuthLogModel.create({
        action: "logout",
        userID: req.user._id,
        username: req.user.username,
        sessionID: token,
      });

      const isProdution = NODE_ENV === "production";
      res.clearCookie("Access_Token", {
        httpOnly: true,
        secure: isProdution,
        sameSite: isProdution ? "none" : "lax",
        path: "/",
      });

      res.status(200).json({
        success: true,
        message: "Logged out successfully",
      });
    } catch (error) {
      next(
        createError(
          500,
          error instanceof Error ? error.message : "Logout failed",
        ),
      );
    }
  }

  async heartbeat(req: Request, res: Response, next: NextFunction) {
    try {
      // If `verifyToken` middleware succeeds, session is valid
      res.status(200).json({ success: true, message: "Session active" });
    } catch (error) {
      next(createError(401, "Session check failed"));
    }
  }

  async getCurrentUser(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user._id) {
        return next(createError(500, "Unauthorized user"));
      }

      const user = await User.findOne({
        _id: req.user._id,
        isDeleted: { $ne: true },
      })
        .select("-password")
        .lean();
      if (!user) {
        return next(createError(500, "User not found in request"));
      }

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      return next(createError(500, "Internal server error"));
    }
  }

  async getLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        search,
        userId,
        username,
        action,
        startDate,
        endDate,
        page = 1,
        limit = 10,
      } = req.query;

      const query: any = {};

      // Add filters if provided
      if (userId) query.userID = userId;
      if (username) query.username = username;
      if (action) query.action = action;
      if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = new Date(startDate as string);
        if (endDate) query.timestamp.$lte = new Date(endDate as string);
      }

      if (search) {
        const searchTerms = (search as string).trim().split(/\s+/);
        query.$and = searchTerms.map((term) => {
          const termRegex = new RegExp(term, "i");
          return {
            $or: [{ username: termRegex }, { action: termRegex }],
          };
        });
      }

      // Calculate skip value for pagination
      const skip = (Number(page) - 1) * Number(limit);

      // Get total count for pagination
      const total = await AuthLogModel.countDocuments(query);

      // Get logs with pagination
      const logs = await AuthLogModel.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(Number(limit));

      res.status(200).json({
        logs,
        currentPage: Number(page),
        limitNumber: Number(limit),
        totalLogs: total,
        totalPages: Math.ceil(total / Number(limit)),
      });
    } catch (error) {
      next(
        createError(
          500,
          error instanceof Error ? error.message : "Failed to fetch auth logs",
        ),
      );
    }
  }
}

export default new AuthController();
