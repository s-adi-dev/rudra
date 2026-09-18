import { NextFunction, Request, Response } from "express";
import Role from "../models/role";
import User from "../models/user";
import createError from "./createError";

const requirePermission = (page: string, action: string) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const user = await User.findById(req.user?._id).select("roles").lean();
      if (!user) return next(createError(401, "User not found"));

      const roles = await Role.find({ name: { $in: user.roles } })
        .select("permissions")
        .lean();
      const hasPermission = roles.some((role) =>
        role.permissions.some(
          (permission) =>
            permission.page === page && permission.actions.includes(action),
        ),
      );

      if (!hasPermission) {
        return next(
          createError(403, "You do not have permission for this action"),
        );
      }

      next();
    } catch (error) {
      next(
        createError(
          500,
          error instanceof Error ? error.message : "Permission check failed",
        ),
      );
    }
  };
};

export default requirePermission;
