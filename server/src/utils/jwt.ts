import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/dotenv";
import { AuthLogModel } from "../models/auth";
import User from "../models/user";
import createError from "../utils/createError";

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

interface Payload {
  _id: string;
  username: string;
  isLocked: boolean;
}

const verifyToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get token from cookies instead of headers
    const token = req.cookies.Access_Token;
    if (!token) {
      return next(createError(401, "Access denied. No token provided"));
    }

    const decoded = jwt.verify(token, JWT_SECRET) as Payload;

    // Find the user in database
    const user = await User.findOne({ _id: decoded._id, isDeleted: { $ne: true } }).select("-password");
    if (!user) {
      res.clearCookie("Access_Token");
      return next(createError(401, "User not found"));
    }

    // Find the most recent auth log for this token and make sure it's not invalidated
    const lastAuthLog = await AuthLogModel.findOne({
      sessionID: token,
      invalidated: { $ne: true },
    });

    if (!lastAuthLog) {
      res.clearCookie("Access_Token");
      return next(createError(401, "Session expired or invalidated"));
    }

    if (user.isLocked) {
      next(
        createError(
          401,
          "Your account has been locked. Please contact your administrator or try again later.",
        ),
      );
      return;
    }

    req.user = decoded;
    next();
  } catch (error) {
    // Clear the cookie if token verification fails
    res.clearCookie("Access_Token");
    next(createError(401, "Invalid token"));
  }
};

export default verifyToken;
