import { NextFunction, Request, Response } from "express";
import { EoiModel } from "../models/eoi";
import createError from "../utils/createError";

class EoiController {
  // Get all EOIs with filters and pagination
  async getAllEoi(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        search,
        applicant,
        manager,
        config,
        eoiNo,
        contact,
        pan,
        status,
        startDate,
        endDate,
        minAmount,
        maxAmount,
        page = 1,
        limit = 10,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = req.query;

      const query: any = {};

      // Add filters if provided
      if (applicant) query.applicant = new RegExp(applicant as string, "i");
      if (manager) query.manager = new RegExp(manager as string, "i");
      if (config) query.config = config;
      if (status) query.status = status;
      if (eoiNo) query.eoiNo = Number(eoiNo);
      if (contact) query.contact = Number(contact);
      if (pan) query.pan = new RegExp(pan as string, "i");

      // Date range filter
      if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = new Date(startDate as string);
        if (endDate) query.date.$lte = new Date(endDate as string);
      }

      // Amount range filter
      if (minAmount || maxAmount) {
        query.eoiAmt = {};
        if (minAmount) query.eoiAmt.$gte = Number(minAmount);
        if (maxAmount) query.eoiAmt.$lte = Number(maxAmount);
      }

      // Search across multiple fields
      if (search) {
        query.$or = [
          { applicant: new RegExp(search as string, "i") },
          { manager: new RegExp(search as string, "i") },
          { config: new RegExp(search as string, "i") },
          { cp: new RegExp(search as string, "i") },
          { pan: new RegExp(search as string, "i") },
          { address: new RegExp(search as string, "i") },
          { status: new RegExp(search as string, "i") },
        ];

        // Add numeric search if search term is a number
        const numericSearch = Number(search);
        if (!isNaN(numericSearch)) {
          query.$or.push(
            { eoiNo: numericSearch },
            { contact: numericSearch },
            { alt: numericSearch },
            { aadhar: numericSearch },
            { eoiAmt: numericSearch },
          );
        }
      }

      // Calculate skip value for pagination
      const skip = (Number(page) - 1) * Number(limit);

      // Build sort object
      const sort: any = {};
      sort[sortBy as string] = sortOrder === "asc" ? 1 : -1;

      // Get total count for pagination
      const total = await EoiModel.countDocuments(query);

      // Get EOIs with pagination
      const eois = await EoiModel.find(query)
        .sort(sort)
        .skip(skip)
        .limit(Number(limit))
        .lean();

      res.status(200).json({
        success: true,
        data: eois,
        currentPage: Number(page),
        limitNumber: Number(limit),
        totalEois: total,
        totalPages: Math.ceil(total / Number(limit)),
      });
    } catch (error) {
      next(
        createError(
          500,
          error instanceof Error ? error.message : "Failed to fetch EOIs",
        ),
      );
    }
  }

  // Get single EOI by ID
  async getEoiById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const eoi = await EoiModel.findById(id).lean();

      if (!eoi) {
        return next(createError(404, "EOI not found"));
      }

      res.status(200).json({
        success: true,
        data: eoi,
      });
    } catch (error) {
      next(
        createError(
          500,
          error instanceof Error ? error.message : "Failed to fetch EOI",
        ),
      );
    }
  }

  // Create new EOI
  async createEoi(req: Request, res: Response, next: NextFunction) {
    try {
      const eoiData = req.body;

      // Generate EOI number if not provided (you might want to customize this logic)
      if (!eoiData.eoiNo) {
        const lastEoi = await EoiModel.findOne().sort({ eoiNo: -1 });
        eoiData.eoiNo = lastEoi ? lastEoi.eoiNo + 1 : 1001;
      }

      // Set default status if not provided
      if (!eoiData.status) {
        eoiData.status = "pending";
      }

      const newEoi = new EoiModel(eoiData);
      const savedEoi = await newEoi.save();

      res.status(201).json({
        success: true,
        message: "EOI created successfully",
        data: savedEoi,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes("duplicate key")) {
        return next(createError(400, "EOI number already exists"));
      }
      next(
        createError(
          500,
          error instanceof Error ? error.message : "Failed to create EOI",
        ),
      );
    }
  }

  // Update EOI by ID
  async updateEoi(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Prevent updating EOI number if provided
      if (updateData.eoiNo) {
        return next(createError(400, "EOI number cannot be updated"));
      }

      const updatedEoi = await EoiModel.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: false }, // runValidators: false since we removed strict validation
      ).lean();

      if (!updatedEoi) {
        return next(createError(404, "EOI not found"));
      }

      res.status(200).json({
        success: true,
        message: "EOI updated successfully",
        data: updatedEoi,
      });
    } catch (error) {
      next(
        createError(
          500,
          error instanceof Error ? error.message : "Failed to update EOI",
        ),
      );
    }
  }

  // Delete EOI by ID
  async deleteEoi(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const deletedEoi = await EoiModel.findByIdAndDelete(id).lean();

      if (!deletedEoi) {
        return next(createError(404, "EOI not found"));
      }

      res.status(200).json({
        success: true,
        message: "EOI deleted successfully",
        data: deletedEoi,
      });
    } catch (error) {
      next(
        createError(
          500,
          error instanceof Error ? error.message : "Failed to delete EOI",
        ),
      );
    }
  }
}

export default new EoiController();
