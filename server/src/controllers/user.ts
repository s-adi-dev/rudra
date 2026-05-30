import { NextFunction, Request, Response } from "express";
import User, { UserAccount } from "../models/user";
import Role from "../models/role";
import createError from "../utils/createError";
import auditService from "../utils/audit-service";
import crypto from "crypto";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

class UserController {
  // Create a new user
  async createUser(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        username,
        password,
        firstName,
        lastName,
        roles,
        email,
        phone,
        dob,
        settings,
      } = req.body;

      // Check if user already exists (and not soft-deleted)
      const existingUser = await User.findOne({
        username,
        isDeleted: { $ne: true },
      });
      if (existingUser) {
        return next(createError(400, "Username already exists"));
      }

      // Check if email already exists (and not soft-deleted)
      if (email) {
        const existingEmail = await User.findOne({
          email,
          isDeleted: { $ne: true },
        });
        if (existingEmail) {
          return next(createError(400, "Email already exists"));
        }
      }

      // Hash password before saving
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

      // Create new user with hashed password
      const newUser = new User({
        username,
        password: hashedPassword,
        firstName,
        lastName,
        roles,
        email,
        phone,
        dob,
        isLocked: false,
        permissions: {},
        settings: settings || { isPassChange: false, isRegistered: false },
      });

      await newUser.save();

      // Create audit log
      await auditService.logCreate(
        newUser.toObject(),
        req,
        "Users",
        `Created user: ${username}`,
      );

      // Create a new object without the password field
      const { password: _, ...userResponse } = newUser.toObject();

      res.status(201).json({
        message: "User created successfully",
        userId: newUser._id,
      });
    } catch (error) {
      next(
        createError(
          500,
          error instanceof Error ? error.message : "Error creating user",
        ),
      );
    }
  }

  async getAllUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        page = 1,
        limit = 10,
        role,
        search,
        includeDeleted = false,
      } = req.query;
      const pageNumber = Number(page);
      const limitNumber = Number(limit);
      const showDeleted = includeDeleted === "true";

      let query: any = showDeleted ? {} : { isDeleted: { $ne: true } }; // Include or exclude soft-deleted users

      if (role) {
        query.roles = role as string;
      }

      if (search) {
        const searchTerms = (search as string).trim().split(/\s+/);
        query.$and = searchTerms.map((term) => {
          const termRegex = new RegExp(term, "i");
          return {
            $or: [
              { username: termRegex },
              { firstName: termRegex },
              { lastName: termRegex },
              { email: termRegex },
              {
                $expr: {
                  $regexMatch: {
                    input: { $concat: ["$firstName", " ", "$lastName"] },
                    regex: termRegex,
                  },
                },
              },
            ],
          };
        });
      }

      // Exclude password field from query
      const users = await User.find(query, { password: 0 })
        .skip((pageNumber - 1) * limitNumber)
        .limit(limitNumber);

      const total = await User.countDocuments(query);

      res.status(200).json({
        users,
        currentPage: pageNumber,
        limitNumber: limitNumber,
        totalPages: Math.ceil(total / limitNumber),
        totalUsers: total,
      });
    } catch (error) {
      next(
        createError(
          500,
          error instanceof Error ? error.message : "Error fetching users",
        ),
      );
    }
  }

  async getUsersSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const { includeDeleted = false } = req.query;
      const showDeleted = includeDeleted === "true";

      const query = showDeleted ? {} : { isDeleted: { $ne: true } };
      const users = await User.find(
        query,
        "_id firstName lastName username roles",
      );
      res.status(200).json(users);
    } catch (error) {
      next(
        createError(
          500,
          error instanceof Error
            ? error.message
            : "Error fetching user summaries",
        ),
      );
    }
  }

  async getUserById(req: Request, res: Response, next: NextFunction) {
    try {
      // Exclude password field from query
      const user = await User.findById(req.params.id).select("-password");

      if (!user) {
        return next(createError(404, "User not found"));
      }

      res.status(200).json(user);
    } catch (error) {
      next(
        createError(
          500,
          error instanceof Error ? error.message : "Error fetching user",
        ),
      );
    }
  }

  async updateUser(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        username,
        firstName,
        lastName,
        email,
        phone,
        roles,
        dob,
        isLocked,
        permissions,
        settings,
      } = req.body;

      // Get original user data for audit comparison
      const originalUser = await User.findOne({
        _id: req.params.id,
        isDeleted: { $ne: true },
      }).lean();
      if (!originalUser) {
        return next(createError(404, "User not found"));
      }

      // Check if username already exists (excluding current user)
      if (username) {
        const existingUser = await User.findOne({
          username,
          _id: { $ne: req.params.id }, // Exclude current user
          isDeleted: { $ne: true },
        });
        if (existingUser) {
          return next(createError(400, "Username already exists"));
        }
      }

      // Check if email already exists (excluding current user)
      if (email) {
        const existingEmail = await User.findOne({
          email,
          _id: { $ne: req.params.id }, // Exclude current user
          isDeleted: { $ne: true },
        });
        if (existingEmail) {
          return next(createError(400, "Email already exists"));
        }
      }

      const updateData: Partial<UserAccount> = {};
      if (username) updateData.username = username;
      if (firstName) updateData.firstName = firstName;
      if (lastName) updateData.lastName = lastName;
      if (email) updateData.email = email;
      if (phone) updateData.phone = phone;
      if (roles) updateData.roles = roles;
      if (dob) updateData.dob = dob;
      if (typeof isLocked === "boolean") updateData.isLocked = isLocked;
      if (permissions) updateData.permissions = permissions;
      if (settings) updateData.settings = settings;

      const updatedUser = await User.findOneAndUpdate(
        { _id: req.params.id, isDeleted: { $ne: true } },
        updateData,
        { new: true, select: "-password" },
      );

      // Create audit log
      if (typeof isLocked === "boolean") {
        await auditService.logUserLockStatus(
          isLocked ? "locked" : "unlocked",
          req,
          "Users",
          `${isLocked ? "Locked user" : "Unlocked user"}: ${originalUser.username}`,
        );
      } else {
        await auditService.logUpdate(
          originalUser,
          updatedUser,
          req,
          "Users",
          `Updated user: ${originalUser.username}`,
        );
      }

      res.status(200).json({
        message: "User updated successfully",
        user: updatedUser,
      });
    } catch (error) {
      next(
        createError(
          500,
          error instanceof Error ? error.message : "Error updating user",
        ),
      );
    }
  }

  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { currentPassword, newPassword, isPassChange = true } = req.body;

      // Find user by ID (include password field for verification)
      const user = await User.findOne({
        _id: req.params.id,
        isDeleted: { $ne: true },
      });
      if (!user) {
        return next(createError(404, "User not found"));
      }

      // Verify current password using bcrypt
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return next(createError(400, "Current password is incorrect"));
      }

      // Hash new password before saving
      const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

      // Update password and reset password change flag
      user.password = hashedPassword;
      user.settings = { isPassChange: isPassChange };
      await user.save();

      res.status(200).json({ message: "Password changed successfully" });
    } catch (error) {
      next(
        createError(
          500,
          error instanceof Error ? error.message : "Error changing password",
        ),
      );
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.params.id;

      // Find the user whose password needs to be reset
      const userToReset = await User.findOne({
        _id: userId,
        isDeleted: { $ne: true },
      });
      if (!userToReset) {
        return next(createError(404, "User not found"));
      }

      // Find the user who is performing the reset
      const resetBy = req.user._id;
      const adminUser = await User.findOne({
        _id: resetBy,
        isDeleted: { $ne: true },
      })
        .select("-password -activeToken") // Exclude sensitive fields
        .lean();
      if (!adminUser) {
        return next(createError(404, "Admin user not found"));
      }

      // Get all roles of the admin user
      const adminRoles = await Role.find({ name: { $in: adminUser.roles } });

      // Check if any of the admin's roles have permission to reset passwords
      const hasResetPermission = adminRoles.some((role) =>
        role.permissions.some(
          (permission) =>
            permission.page === "Users" &&
            permission.actions.includes("reset-password"),
        ),
      );

      if (!hasResetPermission) {
        return next(
          createError(403, "You don't have permission to reset passwords"),
        );
      }

      // Generate a random password (12 characters)
      const newPassword = crypto.randomBytes(3).toString("hex");

      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

      // Update user's password and set isPassChange to false to force password change on next login
      await User.findByIdAndUpdate(userId, {
        password: hashedPassword,
        settings: {
          ...userToReset.settings,
          isPassChange: true,
        },
      });

      // Return the username and new password
      res.status(200).json({
        username: userToReset.username,
        password: newPassword,
      });
    } catch (error) {
      next(
        createError(
          500,
          error instanceof Error ? error.message : "Error resetting password",
        ),
      );
    }
  }

  async softDeleteUser(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await User.findById(req.params.id);

      if (!user) {
        return next(createError(404, "User not found"));
      }

      if (user.isDeleted) {
        return next(createError(400, "User is already deleted"));
      }

      // Soft delete: set isDeleted to true
      user.isDeleted = true;
      const deletedUser = await user.save();

      // Create audit log
      await auditService.logDelete(
        deletedUser,
        req,
        "Users",
        `Soft deleted user: ${deletedUser.username}`,
      );

      res.status(200).json({
        message: "User soft deleted successfully",
        userId: deletedUser._id,
      });
    } catch (error) {
      next(
        createError(
          500,
          error instanceof Error ? error.message : "Error deleting user",
        ),
      );
    }
  }

  async deleteUser(req: Request, res: Response, next: NextFunction) {
    try {
      const deletedUser = await User.findByIdAndDelete(req.params.id);

      if (!deletedUser) {
        return next(createError(404, "User not found"));
      }

      // Create audit log
      await auditService.logDelete(
        deletedUser,
        req,
        "Users",
        `Deleted user: ${deletedUser.username}`,
      );

      res.status(200).json({
        message: "User deleted successfully",
        userId: deletedUser._id,
      });
    } catch (error) {
      next(
        createError(
          500,
          error instanceof Error ? error.message : "Error deleting user",
        ),
      );
    }
  }

  async restoreUser(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.params.id;

      // Find the user to restore (including deleted users)
      const userToRestore = await User.findById(userId);
      if (!userToRestore) {
        return next(createError(404, "User not found"));
      }

      if (!userToRestore.isDeleted) {
        return next(createError(400, "User is not deleted"));
      }

      // Restore the user by setting isDeleted to false
      userToRestore.isDeleted = false;
      const restoredUser = await userToRestore.save();

      // Create audit log
      await auditService.logCreate(
        restoredUser,
        req,
        "Users",
        `Restored user: ${restoredUser.username}`,
      );

      res.status(200).json({
        message: "User restored successfully",
        userId: restoredUser._id,
      });
    } catch (error) {
      next(
        createError(
          500,
          error instanceof Error ? error.message : "Error restoring user",
        ),
      );
    }
  }
}

export default new UserController();
