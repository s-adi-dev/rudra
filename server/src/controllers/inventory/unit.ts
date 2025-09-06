import { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import Category from "../../models/category"; // <-- make sure this path is correct
import { Floor, Unit } from "../../models/inventory"; // Adjust path as needed
import auditService from "../../utils/audit-service";
import createError from "../../utils/createError";

/**
 * Helper: validate/resolve Category by name (string) and return the Category doc.
 * Expects any string; trims & lowercases before lookup.
 * Throws a 400 error if not found.
 */
async function resolveStatusOrThrow(status: unknown) {
  if (!status || typeof status !== "string") {
    throw createError(400, "Status is required");
  }
  const s = status.trim().toLowerCase();
  const cat = await Category.findOne({ name: s });
  if (!cat) {
    throw createError(
      400,
      `Invalid status '${status}'. Create a Category first or use an existing one.`,
    );
  }
  return cat; // caller may use cat.name (string) or cat fields
}

/**
 * Normalize a status filter input (string | string[]) into lowercase names array.
 * Accepts comma-separated strings too (e.g., "available,reserved").
 */
function normalizeStatusFilter(input: unknown): string[] | undefined {
  if (!input) return undefined;
  const arr = Array.isArray(input) ? input : String(input).split(",");
  const cleaned = arr
    .map((s) => String(s).trim().toLowerCase())
    .filter(Boolean);
  return cleaned.length ? cleaned : undefined;
}

class UnitController {
  /**
   * Create a new unit
   */
  public async createUnit(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const {
        floorId,
        unitNumber,
        area,
        configuration,
        unitSpan,
        status,
        reservedByOrReason,
      } = req.body;

      // Validate required fields
      if (
        !floorId ||
        !unitNumber ||
        !area ||
        !configuration ||
        !unitSpan ||
        !status
      ) {
        next(createError(400, "Missing required fields"));
        return;
      }

      // Check if floor exists
      const floorExists = await Floor.findById(floorId);
      if (!floorExists) {
        next(createError(404, "Floor not found"));
        return;
      }

      // Check if unit number already exists in this floor
      const unitExists = await Unit.findOne({ floorId, unitNumber });
      if (unitExists) {
        next(
          createError(
            409,
            "Unit with this number already exists on this floor",
          ),
        );
        return;
      }

      // Validate dynamic status (Category)
      const category = await resolveStatusOrThrow(status);

      // Create new unit
      const unit = new Unit({
        floorId,
        unitNumber,
        area,
        configuration,
        unitSpan,
        status: category.name, // store validated category name
        reservedByOrReason,
      });

      const savedUnit = await unit.save();

      // Add unit to floor
      await Floor.findByIdAndUpdate(floorId, {
        $push: { units: savedUnit._id },
      });

      // Log audit for unit creation
      await auditService.logCreate(
        savedUnit.toObject(),
        req,
        "Unit",
        `Created unit ${unitNumber} on floor ${floorExists.displayNumber || floorId}`,
      );

      res.status(201).json({
        success: true,
        data: savedUnit,
      });
    } catch (error) {
      console.error("Error creating unit:", error);
      next(createError(500, "Server error"));
    }
  }

  /**
   * Get all units with optional filtering
   */
  public async getAllUnits(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { floorId, status, configuration } = req.query;

      // Build query
      const query: Record<string, any> = {};
      if (floorId) query.floorId = floorId;
      if (configuration) query.configuration = configuration;

      // Support single/multiple/comma-separated status filters
      const statuses = normalizeStatusFilter(status);
      if (statuses) {
        query.status = { $in: statuses };
      }

      const units = await Unit.find(query)
        .populate("floorId", "displayNumber type")
        .sort({ unitNumber: 1 });

      res.status(200).json({
        success: true,
        count: units.length,
        data: units,
      });
    } catch (error) {
      console.error("Error fetching units:", error);
      next(createError(500, "Server error"));
    }
  }

  /**
   * Get a single unit by ID
   */
  public async getUnitById(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const unitId = req.params.id;

      if (!mongoose.Types.ObjectId.isValid(unitId)) {
        next(createError(400, "Invalid unit ID format"));
        return;
      }

      const unit = await Unit.findById(unitId).populate(
        "floorId",
        "displayNumber type wingId projectId",
      );

      if (!unit) {
        next(createError(404, "Unit not found"));
        return;
      }

      res.status(200).json({
        success: true,
        data: unit,
      });
    } catch (error) {
      console.error("Error fetching unit:", error);
      next(createError(500, "Server error"));
    }
  }

  /**
   * Update a unit (validates status dynamically if provided)
   */
  public async updateUnit(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const unitId = req.params.id;
      const {
        unitNumber,
        area,
        configuration,
        unitSpan,
        status,
        reservedByOrReason,
        referenceId,
      } = req.body;

      if (!mongoose.Types.ObjectId.isValid(unitId)) {
        next(createError(400, "Invalid unit ID format"));
        return;
      }

      // Find the unit first to ensure it exists
      const existingUnit = await Unit.findById(unitId);
      if (!existingUnit) {
        next(createError(404, "Unit not found"));
        return;
      }

      // Store original data for audit
      const originalData = existingUnit.toObject();

      // Do not allow changing floorId to maintain data integrity
      if (req.body.floorId) {
        next(
          createError(400, "Cannot change floorId. Create a new unit instead."),
        );
        return;
      }

      // Validate status if provided
      let validatedStatus: string | undefined;
      if (status !== undefined) {
        const cat = await resolveStatusOrThrow(status);
        validatedStatus = cat.name;
      }

      const updatedUnit = await Unit.findByIdAndUpdate(
        unitId,
        {
          $set: {
            unitNumber:
              unitNumber !== undefined ? unitNumber : existingUnit.unitNumber,
            area: area !== undefined ? area : existingUnit.area,
            configuration:
              configuration !== undefined
                ? configuration
                : existingUnit.configuration,
            unitSpan: unitSpan !== undefined ? unitSpan : existingUnit.unitSpan,
            status:
              validatedStatus !== undefined
                ? validatedStatus
                : existingUnit.status,
            reservedByOrReason:
              reservedByOrReason !== undefined
                ? reservedByOrReason
                : existingUnit.reservedByOrReason,
            referenceId:
              referenceId !== undefined
                ? referenceId
                : existingUnit.referenceId,
          },
        },
        { new: true },
      );

      // Log audit for unit update
      await auditService.logUpdate(
        originalData,
        updatedUnit?.toObject(),
        req,
        "Unit",
        `Updated unit ${existingUnit.unitNumber} (ID: ${unitId})`,
      );

      res.status(200).json({
        success: true,
        data: updatedUnit,
      });
    } catch (error) {
      console.error("Error updating unit:", error);
      next(createError(500, "Server error"));
    }
  }

  /**
   * Update unit status (uses dynamic Category validation)
   */
  public async updateUnitStatus(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const unitId = req.params.id;
      const { status, reservedByOrReason } = req.body;

      if (!mongoose.Types.ObjectId.isValid(unitId)) {
        next(createError(400, "Invalid unit ID format"));
        return;
      }

      // Validate desired status via Category
      const category = await resolveStatusOrThrow(status);

      // Ensure unit exists
      const existingUnit = await Unit.findById(unitId);
      if (!existingUnit) {
        next(createError(404, "Unit not found"));
        return;
      }

      // Store original data for audit
      const originalData = existingUnit.toObject();

      // Build update
      const updateObj: Record<string, any> = { status: category.name };

      if (category.name === "available") {
        updateObj.reservedByOrReason = null;
      } else if (reservedByOrReason !== undefined) {
        updateObj.reservedByOrReason = reservedByOrReason;
      }

      const updatedUnit = await Unit.findByIdAndUpdate(
        unitId,
        { $set: updateObj },
        { new: true },
      );

      // Log audit for status update
      await auditService.logUpdate(
        originalData,
        updatedUnit?.toObject(),
        req,
        "Unit",
        `Updated status of unit ${existingUnit.unitNumber} from ${originalData.status} to ${category.name}`,
      );

      res.status(200).json({
        success: true,
        data: updatedUnit,
      });
    } catch (error) {
      console.error("Error updating unit status:", error);
      next(createError(500, "Server error"));
    }
  }

  /**
   * Delete a unit
   */
  public async deleteUnit(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const unitId = req.params.id;

      if (!mongoose.Types.ObjectId.isValid(unitId)) {
        next(createError(400, "Invalid unit ID format"));
        return;
      }

      const unit = await Unit.findById(unitId);
      if (!unit) {
        next(createError(404, "Unit not found"));
        return;
      }

      // Store unit data for audit before deletion
      const unitData = unit.toObject();

      // Remove unit from floor's units array
      await Floor.findByIdAndUpdate(unit.floorId, {
        $pull: { units: unitId },
      });

      // Delete the unit
      await Unit.findByIdAndDelete(unitId);

      // Log audit for unit deletion
      await auditService.logDelete(
        unitData,
        req,
        "Unit",
        `Deleted unit ${unitData.unitNumber} (ID: ${unitId})`,
      );

      res.status(200).json({
        success: true,
        message: "Unit deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting unit:", error);
      next(createError(500, "Server error"));
    }
  }
}

export const unitController = new UnitController();
