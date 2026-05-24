import { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import { ClientPartner, CPEmployee } from "../models/client-partner";
import { Visit } from "../models/visit";
import auditService from "../utils/audit-service";
import createError from "../utils/createError";

class CPManagementController {
  /**
   * Merge two client partners
   * Transfers all employees from source to target client partner
   * Soft deletes the source client partner
   */
  async mergeClientPartners(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { sourceId, targetId } = req.body;

      // Validate input
      if (!sourceId || !targetId) {
        next(createError(400, "sourceId and targetId are required"));
        return;
      }

      if (sourceId === targetId) {
        next(
          createError(
            400,
            "Source and target client partners must be different",
          ),
        );
        return;
      }

      // Fetch both client partners
      const sourceCP = await ClientPartner.findOne({
        _id: sourceId,
        isDeleted: { $ne: true },
      }).session(session);

      const targetCP = await ClientPartner.findOne({
        _id: targetId,
        isDeleted: { $ne: true },
      }).session(session);

      if (!sourceCP) {
        await session.abortTransaction();
        session.endSession();
        next(createError(404, "Source client partner not found"));
        return;
      }

      if (!targetCP) {
        await session.abortTransaction();
        session.endSession();
        next(createError(404, "Target client partner not found"));
        return;
      }

      // Get all employees from source client partner
      const sourceEmployees = await CPEmployee.find({
        clientPartnerId: sourceCP._id,
        isDeleted: { $ne: true },
      }).session(session);

      // Transfer employees to target client partner
      const transferredEmployeeIds = [];
      for (const employee of sourceEmployees) {
        // Update employee's clientPartnerId to target
        await CPEmployee.findByIdAndUpdate(
          employee._id,
          { clientPartnerId: targetCP._id },
          { new: true, session },
        );
        transferredEmployeeIds.push(employee._id);
      }

      // Add transferred employees to target client partner's employee list
      if (transferredEmployeeIds.length > 0) {
        await ClientPartner.findByIdAndUpdate(
          targetCP._id,
          {
            $push: {
              employees: { $each: transferredEmployeeIds },
            },
          },
          { session },
        );
      }

      // Remove transferred employees from source client partner's employee list
      await ClientPartner.findByIdAndUpdate(
        sourceCP._id,
        {
          $pull: {
            employees: { $in: transferredEmployeeIds },
          },
        },
        { session },
      );

      // Soft delete source client partner
      const deletedCP = await ClientPartner.findByIdAndUpdate(
        sourceCP._id,
        { isDeleted: true, updatedBy: req.user.username },
        { new: true, session },
      );

      // Commit transaction
      await session.commitTransaction();
      session.endSession();

      // Create audit log
      await auditService.logUpdate(
        sourceCP.toObject(),
        deletedCP!.toObject(),
        req,
        "ClientPartner",
        `Merged client partner '${sourceCP.name}' into '${targetCP.name}'. Transferred ${transferredEmployeeIds.length} employees.`,
      );

      res.status(200).json({
        message: "Client partners merged successfully",
        transferredEmployees: sourceEmployees.map((emp) => ({
          _id: emp._id,
          name: `${emp.firstName} ${emp.lastName}`,
        })),
        transferCount: transferredEmployeeIds.length,
        targetClientPartner: targetCP.name,
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();

      if (error instanceof mongoose.Error.CastError) {
        next(createError(400, "Invalid ID format"));
        return;
      }

      next(
        createError(
          500,
          error instanceof Error
            ? error.message
            : "Error merging client partners",
        ),
      );
    }
  }

  /**
   * Merge two CP employees
   * Transfers all referred clients from source to target employee
   * Soft deletes the source employee
   */
  async mergeEmployees(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { sourceId, targetId } = req.body;

      // Validate input
      if (!sourceId || !targetId) {
        next(createError(400, "sourceId and targetId are required"));
        return;
      }

      if (sourceId === targetId) {
        next(createError(400, "Source and target employees must be different"));
        return;
      }

      // Fetch both employees
      const sourceEmployee = await CPEmployee.findOne({
        _id: sourceId,
        isDeleted: { $ne: true },
      }).session(session);

      const targetEmployee = await CPEmployee.findOne({
        _id: targetId,
        isDeleted: { $ne: true },
      }).session(session);

      if (!sourceEmployee) {
        await session.abortTransaction();
        session.endSession();
        next(createError(404, "Source employee not found"));
        return;
      }

      if (!targetEmployee) {
        await session.abortTransaction();
        session.endSession();
        next(createError(404, "Target employee not found"));
        return;
      }

      // Verify both employees belong to the same client partner
      if (
        sourceEmployee.clientPartnerId.toString() !==
        targetEmployee.clientPartnerId.toString()
      ) {
        await session.abortTransaction();
        session.endSession();
        next(
          createError(400, "Employees must belong to the same client partner"),
        );
        return;
      }

      // Get all referred clients from source employee
      const referredClientIds = sourceEmployee.referredClients || [];

      // Transfer referred clients to target employee
      if (referredClientIds.length > 0) {
        await CPEmployee.findByIdAndUpdate(
          targetEmployee._id,
          {
            $push: {
              referredClients: { $each: referredClientIds },
            },
          },
          { session },
        );
      }

      // Clear referred clients from source employee
      await CPEmployee.findByIdAndUpdate(
        sourceEmployee._id,
        { referredClients: [] },
        { session },
      );

      // Soft delete source employee
      const deletedEmployee = await CPEmployee.findByIdAndUpdate(
        sourceEmployee._id,
        { isDeleted: true },
        { new: true, session },
      );

      // Remove source employee from client partner's employee list
      await ClientPartner.findByIdAndUpdate(
        sourceEmployee.clientPartnerId,
        {
          $pull: { employees: sourceEmployee._id },
        },
        { session },
      );

      // Commit transaction
      await session.commitTransaction();
      session.endSession();

      // Create audit log
      await auditService.logUpdate(
        sourceEmployee.toObject(),
        deletedEmployee!.toObject(),
        req,
        "CPEmployee",
        `Merged employee '${sourceEmployee.firstName} ${sourceEmployee.lastName}' into '${targetEmployee.firstName} ${targetEmployee.lastName}'. Transferred ${referredClientIds.length} referred clients.`,
      );

      res.status(200).json({
        message: "Employees merged successfully",
        transferredReferrals: referredClientIds.length,
        targetEmployee: {
          _id: targetEmployee._id,
          name: `${targetEmployee.firstName} ${targetEmployee.lastName}`,
        },
        sourceEmployee: {
          _id: sourceEmployee._id,
          name: `${sourceEmployee.firstName} ${sourceEmployee.lastName}`,
        },
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();

      if (error instanceof mongoose.Error.CastError) {
        next(createError(400, "Invalid ID format"));
        return;
      }

      next(
        createError(
          500,
          error instanceof Error ? error.message : "Error merging employees",
        ),
      );
    }
  }

  /**
   * Transfer a single employee to a different client partner
   * Moves employee and all their referred clients to the target client partner
   */
  async transferEmployee(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { employeeId, targetClientPartnerId } = req.body;

      // Validate input
      if (!employeeId || !targetClientPartnerId) {
        next(
          createError(400, "employeeId and targetClientPartnerId are required"),
        );
        return;
      }

      // Fetch the employee
      const employee = await CPEmployee.findOne({
        _id: employeeId,
        isDeleted: { $ne: true },
      }).session(session);

      if (!employee) {
        await session.abortTransaction();
        session.endSession();
        next(createError(404, "Employee not found"));
        return;
      }

      // Check if target client partner exists
      const targetCP = await ClientPartner.findOne({
        _id: targetClientPartnerId,
        isDeleted: { $ne: true },
      }).session(session);

      if (!targetCP) {
        await session.abortTransaction();
        session.endSession();
        next(createError(404, "Target client partner not found"));
        return;
      }

      // Prevent transferring to the same client partner
      if (employee.clientPartnerId.toString() === targetClientPartnerId) {
        await session.abortTransaction();
        session.endSession();
        next(
          createError(400, "Employee already belongs to this client partner"),
        );
        return;
      }

      // Get source client partner
      const sourceCP = await ClientPartner.findOne({
        _id: employee.clientPartnerId,
      }).session(session);

      // Store original data for audit
      const originalEmployee = employee.toObject();
      const referredClientCount = employee.referredClients?.length || 0;

      // Update employee's client partner
      const updatedEmployee = await CPEmployee.findByIdAndUpdate(
        employeeId,
        { clientPartnerId: targetClientPartnerId },
        { new: true, session },
      );

      // Add employee to target client partner's employee list
      await ClientPartner.findByIdAndUpdate(
        targetClientPartnerId,
        {
          $push: { employees: employeeId },
        },
        { session },
      );

      // Remove employee from source client partner's employee list
      await ClientPartner.findByIdAndUpdate(
        employee.clientPartnerId,
        {
          $pull: { employees: employeeId },
        },
        { session },
      );

      // Commit transaction
      await session.commitTransaction();
      session.endSession();

      // Create audit log
      await auditService.logUpdate(
        originalEmployee,
        updatedEmployee!.toObject(),
        req,
        "CPEmployee",
        `Transferred employee '${employee.firstName} ${employee.lastName}' from '${sourceCP?.name}' to '${targetCP.name}'. Transferred ${referredClientCount} referred clients.`,
      );

      res.status(200).json({
        message: "Employee transferred successfully",
        employee: {
          _id: updatedEmployee!._id,
          name: `${updatedEmployee!.firstName} ${updatedEmployee!.lastName}`,
          position: updatedEmployee!.position,
        },
        sourceClientPartner: sourceCP?.name,
        targetClientPartner: targetCP.name,
        transferredReferrals: referredClientCount,
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();

      if (error instanceof mongoose.Error.CastError) {
        next(createError(400, "Invalid ID format"));
        return;
      }

      next(
        createError(
          500,
          error instanceof Error
            ? error.message
            : "Error transferring employee",
        ),
      );
    }
  }

  /**
   * Get potential merge candidates for client partners
   * Returns similar client partners (by name, email, phone)
   */
  async getClientPartnerMergeCandidates(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { cpId } = req.params;
      const { threshold = 0.8 } = req.query; // Similarity threshold

      // Find the current client partner
      const currentCP = await ClientPartner.findOne({
        _id: cpId,
        isDeleted: { $ne: true },
      });

      if (!currentCP) {
        next(createError(404, "Client partner not found"));
        return;
      }

      // Find all other non-deleted client partners
      const allCPs = await ClientPartner.find({
        _id: { $ne: cpId },
        isDeleted: { $ne: true },
      }).populate({
        path: "employees",
        match: { isDeleted: { $ne: true } },
      });

      // Calculate similarity score and filter candidates
      const candidates = allCPs
        .map((cp) => {
          let similarityScore = 0;
          let reasons = [];

          // Check name similarity
          const currentName = currentCP.name.toLowerCase();
          const cpName = cp.name.toLowerCase();
          if (currentName === cpName) {
            similarityScore += 0.4;
            reasons.push("Same name");
          } else if (
            currentName.includes(cpName) ||
            cpName.includes(currentName)
          ) {
            similarityScore += 0.2;
            reasons.push("Similar name");
          }

          // Check email match
          if (
            currentCP.email &&
            cp.email &&
            currentCP.email.toLowerCase() === cp.email.toLowerCase()
          ) {
            similarityScore += 0.3;
            reasons.push("Same email");
          }

          // Check phone match
          if (
            currentCP.phoneNo &&
            cp.phoneNo &&
            currentCP.phoneNo === cp.phoneNo
          ) {
            similarityScore += 0.3;
            reasons.push("Same phone");
          }

          return {
            _id: cp._id,
            name: cp.name,
            email: cp.email,
            phoneNo: cp.phoneNo,
            employeeCount: cp.employees?.length || 0,
            similarityScore,
            reasons,
          };
        })
        .filter((candidate) => candidate.similarityScore >= Number(threshold))
        .sort((a, b) => b.similarityScore - a.similarityScore);

      res.status(200).json({
        currentCP: {
          _id: currentCP._id,
          name: currentCP.name,
          employeeCount: currentCP.employees?.length || 0,
        },
        mergeCandidates: candidates,
        candidateCount: candidates.length,
      });
    } catch (error) {
      if (error instanceof mongoose.Error.CastError) {
        next(createError(400, "Invalid ID format"));
        return;
      }

      next(
        createError(
          500,
          error instanceof Error
            ? error.message
            : "Error fetching merge candidates",
        ),
      );
    }
  }

  /**
   * Get potential merge candidates for employees
   * Returns employees from the same client partner with similar names or contact info
   */
  async getEmployeeMergeCandidates(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { employeeId } = req.params;
      const { threshold = 0.7 } = req.query; // Similarity threshold

      // Find the current employee
      const currentEmployee = await CPEmployee.findOne({
        _id: employeeId,
        isDeleted: { $ne: true },
      });

      if (!currentEmployee) {
        next(createError(404, "Employee not found"));
        return;
      }

      // Find all other employees from same client partner (non-deleted)
      const allEmployees = await CPEmployee.find({
        _id: { $ne: employeeId },
        clientPartnerId: currentEmployee.clientPartnerId,
        isDeleted: { $ne: true },
      });

      // Calculate similarity score and filter candidates
      const candidates = allEmployees
        .map((emp) => {
          let similarityScore = 0;
          let reasons = [];

          // Check full name match
          const currentFullName =
            `${currentEmployee.firstName} ${currentEmployee.lastName}`.toLowerCase();
          const empFullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();

          if (currentFullName === empFullName) {
            similarityScore += 0.4;
            reasons.push("Same full name");
          } else if (
            currentEmployee.firstName.toLowerCase() ===
            emp.firstName.toLowerCase()
          ) {
            similarityScore += 0.2;
            reasons.push("Same first name");
          }

          // Check email match
          if (
            currentEmployee.email &&
            emp.email &&
            currentEmployee.email.toLowerCase() === emp.email.toLowerCase()
          ) {
            similarityScore += 0.3;
            reasons.push("Same email");
          }

          // Check phone match
          if (
            currentEmployee.phoneNo &&
            emp.phoneNo &&
            currentEmployee.phoneNo === emp.phoneNo
          ) {
            similarityScore += 0.3;
            reasons.push("Same phone");
          }

          return {
            _id: emp._id,
            firstName: emp.firstName,
            lastName: emp.lastName,
            email: emp.email,
            phoneNo: emp.phoneNo,
            position: emp.position,
            referredClientCount: emp.referredClients?.length || 0,
            similarityScore,
            reasons,
          };
        })
        .filter((candidate) => candidate.similarityScore >= Number(threshold))
        .sort((a, b) => b.similarityScore - a.similarityScore);

      res.status(200).json({
        currentEmployee: {
          _id: currentEmployee._id,
          name: `${currentEmployee.firstName} ${currentEmployee.lastName}`,
          referredClientCount: currentEmployee.referredClients?.length || 0,
        },
        mergeCandidates: candidates,
        candidateCount: candidates.length,
      });
    } catch (error) {
      if (error instanceof mongoose.Error.CastError) {
        next(createError(400, "Invalid ID format"));
        return;
      }

      next(
        createError(
          500,
          error instanceof Error
            ? error.message
            : "Error fetching merge candidates",
        ),
      );
    }
  }
}

export default new CPManagementController();
