import { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import { CPEmployee } from "../models/client-partner";
import ClientBooking, { ClientBookingType } from "../models/clientBooking";
import { Unit } from "../models/inventory";
import AuditService from "../utils/audit-service"; // Import the audit service
import createError from "../utils/createError";

interface ClientPartner {
  _id: string;
  name: string;
}

interface CPEmployeePopulated {
  _id: string;
  firstName: string;
  lastName: string;
  clientPartnerId: ClientPartner | mongoose.Types.ObjectId;
}

export class ClientBookingController {
  /**
   * Create a new client booking
   */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const bookingData: ClientBookingType = req.body;

      // First, validate the unit ID exists
      if (!bookingData.unit) {
        return next(createError(400, "Unit ID is required"));
      }

      // Check if the unit exists
      const unit = await Unit.findById(bookingData.unit);
      if (!unit) {
        return next(createError(404, "Unit not found"));
      }

      // Create the booking
      const newBooking = new ClientBooking(bookingData);
      const savedBooking = await newBooking.save();

      // Update the unit with the booking's reference
      unit.status = "booked";
      unit.reservedByOrReason = savedBooking.applicant;
      unit.referenceId = savedBooking._id;
      await unit.save();

      // Log the creation in audit
      await AuditService.logCreate(
        savedBooking.toObject(),
        req,
        "ClientBooking",
        `Created new client booking for ${savedBooking.applicant} - Unit: ${savedBooking.wing + "-" + unit.unitNumber} in Project: ${savedBooking.project}`,
      );

      res.status(201).json({
        success: true,
        data: savedBooking,
      });
    } catch (error) {
      next(
        createError(
          400,
          error instanceof Error ? error.message : "An unknown error occurred",
        ),
      );
    }
  }

  /**
   * Get all client bookings with pagination and filtering
   */
  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        fromDate,
        toDate,
        fromRegDate,
        toRegDate,
        status,
        project,
        plan, // paymentType
        manager, // salesManager
      } = req.query;

      const pageNumber = parseInt(page as string) || 1;
      const limitNumber = parseInt(limit as string) || 10;
      const skip = (pageNumber - 1) * limitNumber;

      // Build filter object
      const filter: any = {};

      // Text search across multiple fields
      if (search) {
        const searchTerms = (search as string).trim().split(/\s+/);
        if (searchTerms.length > 0) {
          // Create an AND condition for all search terms
          const andConditions = searchTerms.map((term) => {
            const termRegex = new RegExp(term, "i");
            // Each term should match at least one field (OR condition)
            return {
              $or: [
                { applicant: termRegex },
                { coApplicant: termRegex },
                { phoneNo: termRegex },
                { altNo: termRegex },
                { email: termRegex },
                { address: termRegex },
                { project: termRegex },
              ],
            };
          });

          // Add AND condition to the filter
          filter.$and = andConditions;
        }
      }

      // Date range filter with timezone adjustment
      if (fromDate || toDate) {
        filter.date = {};

        if (fromDate) {
          // Create date in local timezone (IST)
          const fromDateStr = fromDate as string;
          const fromDateObj = new Date(fromDateStr);

          // Adjust to IST by adding the timezone offset
          const offset = fromDateObj.getTimezoneOffset() * 60000;
          const localFromDate = new Date(fromDateObj.getTime() - offset);
          localFromDate.setHours(0, 0, 0, 0);

          filter.date.$gte = localFromDate;
        }

        if (toDate) {
          // Create date in local timezone (IST)
          const toDateStr = toDate as string;
          const toDateObj = new Date(toDateStr);

          // Adjust to IST by adding the timezone offset
          const offset = toDateObj.getTimezoneOffset() * 60000;
          const localToDate = new Date(toDateObj.getTime() - offset);
          localToDate.setHours(23, 59, 59, 999);

          filter.date.$lte = localToDate;
        }
      }

      // Registration date range filter with timezone adjustment
      if (fromRegDate || toRegDate) {
        filter.registrationDate = {};

        if (fromRegDate) {
          // Create date in local timezone (IST)
          const fromRegDateStr = fromRegDate as string;
          const fromRegDateObj = new Date(fromRegDateStr);

          // Adjust to IST by adding the timezone offset
          const offset = fromRegDateObj.getTimezoneOffset() * 60000;
          const localFromRegDate = new Date(fromRegDateObj.getTime() - offset);
          localFromRegDate.setHours(0, 0, 0, 0);

          filter.registrationDate.$gte = localFromRegDate;
        }

        if (toRegDate) {
          // Create date in local timezone (IST)
          const toRegDateStr = toRegDate as string;
          const toRegDateObj = new Date(toRegDateStr);

          // Adjust to IST by adding the timezone offset
          const offset = toRegDateObj.getTimezoneOffset() * 60000;
          const localToRegDate = new Date(toRegDateObj.getTime() - offset);
          localToRegDate.setHours(23, 59, 59, 999);

          filter.registrationDate.$lte = localToRegDate;
        }
      }

      // Status filter
      if (status) {
        filter.status = status;
      }

      // Project filter
      if (project) {
        filter.project = project;
      }

      // Payment type filter (plan)
      if (plan) {
        filter.paymentType = plan;
      }

      // Sales manager filter
      if (manager) {
        filter.salesManager = manager;
      }

      // First, fetch filtered bookings with pagination
      const bookings = await ClientBooking.find(filter)
        .populate({
          path: "unit",
          select: "unitNumber area configuration",
          model: "Unit",
        })
        .skip(skip)
        .limit(limitNumber)
        .sort({ date: -1 });

      // Then, conditionally populate clientPartner only if it's an ObjectId
      const populatedBookings = await Promise.all(
        bookings.map(async (booking) => {
          const bookingObj = booking.toObject();

          // Only attempt to populate if the clientPartner is a valid ObjectId
          if (
            booking.clientPartner &&
            mongoose.Types.ObjectId.isValid(booking.clientPartner)
          ) {
            try {
              // Use the typed version with populated fields
              const clientPartner = (await CPEmployee.findById(
                booking.clientPartner,
              ).populate(
                "clientPartnerId",
                "name",
              )) as unknown as CPEmployeePopulated;

              if (clientPartner) {
                let clientPartnerName = "Unknown";

                // Type guard to check if clientPartnerId is an object with a name property
                if (
                  clientPartner.clientPartnerId &&
                  typeof clientPartner.clientPartnerId === "object" &&
                  "name" in clientPartner.clientPartnerId
                ) {
                  clientPartnerName = clientPartner.clientPartnerId.name;
                }

                const newBooking = {
                  ...bookingObj,
                  clientPartner: `${clientPartner.firstName} ${clientPartner.lastName} (${clientPartnerName})`,
                };
                return newBooking;
              }
            } catch (err) {
              // If population fails, return the original booking
              console.error("Error populating clientPartner:", err);
              return bookingObj;
            }
          }
          return bookingObj;
        }),
      );

      // Count total documents with the same filter for accurate pagination
      const total = await ClientBooking.countDocuments(filter);

      res.status(200).json({
        success: true,
        total,
        totalPages: Math.ceil(total / limitNumber),
        currentPage: pageNumber,
        limit: limitNumber,
        data: populatedBookings,
      });
    } catch (error) {
      next(
        createError(
          500,
          error instanceof Error ? error.message : "Error fetching bookings",
        ),
      );
    }
  }

  /**
   * Get a single client booking by ID
   */
  async getById(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const id = req.params.id;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return next(createError(400, "Invalid booking ID format"));
      }

      // First, find the booking
      const booking = await ClientBooking.findById(id).populate({
        path: "unit",
        select: "unitNumber area configuration",
        model: "Unit",
      });

      if (!booking) {
        return next(createError(404, "Booking not found"));
      }

      const bookingObj = booking.toObject();

      // Then, conditionally populate clientPartner if it's a valid ObjectId
      if (
        booking.clientPartner &&
        mongoose.Types.ObjectId.isValid(booking.clientPartner)
      ) {
        try {
          // Use the typed version with populated fields
          const clientPartner = (await CPEmployee.findById(
            booking.clientPartner,
          ).populate(
            "clientPartnerId",
            "name",
          )) as unknown as CPEmployeePopulated;

          if (clientPartner) {
            let clientPartnerName = "Unknown";

            // Type guard to check if clientPartnerId is an object with a name property
            if (
              clientPartner.clientPartnerId &&
              typeof clientPartner.clientPartnerId === "object" &&
              "name" in clientPartner.clientPartnerId
            ) {
              clientPartnerName = clientPartner.clientPartnerId.name;
            }

            // Update the booking object with formatted clientPartner information
            bookingObj.clientPartner = `${clientPartner.firstName} ${clientPartner.lastName} (${clientPartnerName})`;
          }
        } catch (err) {
          // If population fails, continue with the original booking
          console.error("Error populating clientPartner:", err);
        }
      }

      res.status(200).json({
        success: true,
        data: bookingObj,
      });
    } catch (error) {
      next(
        createError(
          500,
          error instanceof Error ? error.message : "Error fetching booking",
        ),
      );
    }
  }

  /**
   * Update a client booking
   */
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id;
      const updateData = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return next(createError(400, "Invalid booking ID format"));
      }

      // Get the original booking data for audit logging
      const originalBooking = await ClientBooking.findById(id);
      if (!originalBooking) {
        return next(createError(404, "Booking not found"));
      }

      // Store original data for audit
      const originalData = originalBooking.toObject();

      // Update the booking without population
      const updatedBooking = await ClientBooking.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: true },
      ).populate("unit");

      if (!updatedBooking) {
        return next(createError(404, "Booking not found"));
      }

      // Then conditionally populate clientPartner if it's a valid ObjectId
      if (
        updatedBooking.clientPartner &&
        mongoose.Types.ObjectId.isValid(updatedBooking.clientPartner)
      ) {
        try {
          await updatedBooking.populate("clientPartner");
        } catch (err) {
          // If population fails, continue with the original booking
          console.log("Failed to populate clientPartner:", err);
        }
      }

      // Log the update in audit
      await AuditService.logUpdate(
        originalData,
        updatedBooking.toObject(),
        req,
        "ClientBooking",
        `Updated client booking ${updateData.status ? "status " : ""}for ${updatedBooking.applicant} - ID: ${id}`,
      );

      res.status(200).json({
        success: true,
        data: updatedBooking,
      });
    } catch (error) {
      next(
        createError(
          400,
          error instanceof Error ? error.message : "Error updating booking",
        ),
      );
    }
  }

  /**
   * Delete a client booking
   */
  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return next(createError(400, "Invalid booking ID format"));
      }

      // Get the booking data before deletion for audit logging
      const bookingToDelete = await ClientBooking.findById(id);
      if (!bookingToDelete) {
        return next(createError(404, "Booking not found"));
      }

      // Store booking data for audit
      const deletedData = bookingToDelete.toObject();

      // Delete the booking
      const deletedBooking = await ClientBooking.findByIdAndDelete(id);

      if (!deletedBooking) {
        return next(createError(404, "Booking not found"));
      }

      // Log the deletion in audit
      await AuditService.logDelete(
        deletedData,
        req,
        "ClientBooking",
        `Deleted client booking for ${deletedData.applicant} - ID: ${id}`,
      );

      res.status(200).json({
        success: true,
        message: "Booking deleted successfully",
      });
    } catch (error) {
      next(
        createError(
          500,
          error instanceof Error ? error.message : "Error deleting booking",
        ),
      );
    }
  }
}

export default new ClientBookingController();
