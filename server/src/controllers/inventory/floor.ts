import { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import { Floor, Project, Unit, Wing } from "../../models/inventory";
import auditService from "../../utils/audit-service";
import createError from "../../utils/createError";

type FloorUnitPayload = {
  unitNumber: string;
  area: number;
  configuration: string;
  unitSpan: number;
  status: string;
  partnerId?: string;
  reservedByOrReason?: string;
  referenceId?: string;
};

type CreateFloorPayload = {
  projectId: string;
  wingId?: string;
  type: "residential" | "commercial";
  displayNumber: number;
  showArea: boolean;
  units: FloorUnitPayload[];
};

class FloorController {
  async createFloor(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const createdUnitIds: mongoose.Types.ObjectId[] = [];
    let createdFloorId: mongoose.Types.ObjectId | undefined;

    try {
      const payload = req.body as CreateFloorPayload;

      if (!mongoose.Types.ObjectId.isValid(payload.projectId)) {
        return next(createError(400, "Invalid project ID"));
      }

      if (payload.wingId && !mongoose.Types.ObjectId.isValid(payload.wingId)) {
        return next(createError(400, "Invalid wing ID"));
      }

      if (
        !payload.type ||
        !Number.isInteger(payload.displayNumber) ||
        payload.displayNumber < 0 ||
        !Array.isArray(payload.units) ||
        payload.units.length === 0
      ) {
        return next(
          createError(
            400,
            "Floor type, display number, and at least one unit are required",
          ),
        );
      }

      const project = await Project.findById(payload.projectId);
      if (!project) return next(createError(404, "Project not found"));

      let wing;
      if (payload.wingId) {
        wing = await Wing.findOne({
          _id: payload.wingId,
          projectId: payload.projectId,
        });
        if (!wing) return next(createError(404, "Wing not found in project"));
      }

      if (payload.type === "residential" && !wing) {
        return next(
          createError(400, "Residential floors must belong to a wing"),
        );
      }

      if (payload.type === "commercial") {
        const expectedPlacement = wing ? "wingLevel" : "projectLevel";
        if (project.commercialUnitPlacement !== expectedPlacement) {
          return next(
            createError(
              400,
              `Commercial floors must be added at ${project.commercialUnitPlacement} level`,
            ),
          );
        }
      }

      const floorParentQuery = wing
        ? { projectId: project._id, wingId: wing._id, type: payload.type }
        : {
            projectId: project._id,
            type: payload.type,
            wingId: { $exists: false },
          };
      const duplicateFloor = await Floor.findOne({
        ...floorParentQuery,
        displayNumber: payload.displayNumber,
      });
      if (duplicateFloor) {
        return next(
          createError(409, "A floor with this number already exists"),
        );
      }

      const unitNumbers = payload.units.map((unit) => unit.unitNumber.trim());
      if (
        unitNumbers.some((unitNumber) => !unitNumber) ||
        new Set(unitNumbers).size !== unitNumbers.length
      ) {
        return next(
          createError(400, "Unit numbers must be unique and non-empty"),
        );
      }

      const totalUnitSpan = payload.units.reduce(
        (total, unit) => total + Number(unit.unitSpan),
        0,
      );
      if (
        payload.units.some(
          (unit) =>
            !Number.isFinite(unit.area) ||
            unit.area <= 0 ||
            !Number.isInteger(unit.unitSpan) ||
            unit.unitSpan < 1 ||
            !unit.configuration ||
            !unit.status,
        )
      ) {
        return next(createError(400, "Every unit must have valid details"));
      }
      if (wing && totalUnitSpan !== wing.unitsPerFloor) {
        return next(
          createError(
            400,
            `Unit span must equal ${wing.unitsPerFloor} for this wing`,
          ),
        );
      }

      const floor = await Floor.create({
        projectId: project._id,
        ...(wing ? { wingId: wing._id } : {}),
        type: payload.type,
        displayNumber: payload.displayNumber,
        showArea: payload.showArea,
        units: [],
      });
      createdFloorId = floor._id;

      for (const unitData of payload.units) {
        const unit = await Unit.create({
          floorId: floor._id,
          unitNumber: unitData.unitNumber.trim(),
          area: unitData.area,
          configuration: unitData.configuration,
          unitSpan: unitData.unitSpan,
          status: unitData.status,
          partnerId: unitData.partnerId,
          reservedByOrReason: unitData.reservedByOrReason,
          referenceId: unitData.referenceId,
        });
        createdUnitIds.push(unit._id);
        floor.units.push(unit._id);
      }
      await floor.save();

      if (wing) {
        if (payload.type === "commercial") {
          wing.commercialFloors!.push(floor._id);
        } else {
          wing.floors.push(floor._id);
        }
        await wing.save();
      } else {
        project.commercialFloors!.push(floor._id);
        await project.save();
      }

      await auditService.logCreate(
        floor.toObject(),
        req,
        "Inventory",
        `Created ${payload.type} floor ${payload.displayNumber}`,
      );

      res.status(201).json({
        success: true,
        data: await Floor.findById(floor._id).populate("units"),
      });
    } catch (error) {
      if (createdUnitIds.length)
        await Unit.deleteMany({ _id: { $in: createdUnitIds } });
      if (createdFloorId) await Floor.findByIdAndDelete(createdFloorId);
      next(
        createError(
          500,
          error instanceof Error ? error.message : "Failed to create floor",
        ),
      );
    }
  }
}

export const floorController = new FloorController();
