import { Request, Response } from "express";
import ClientBooking from "../models/clientBooking";
import { Visit } from "../models/visit";

interface SalesManagerStats {
  salesManager: string;
  totalBookings: number;
  canceledBookings: number;
  totalVisits: number;
}

export const getSalesManagerStats = async (
  req: Request,
  res: Response,
): Promise<any> => {
  try {
    const { startDate, endDate } = req.query;

    // Validate date inputs
    if (!startDate || !endDate) {
      return res.status(400).json({
        message: "Both startDate and endDate are required as query parameters",
      });
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: "Invalid date format" });
    }

    // Adjust end date to include the entire day
    const adjustedStart = new Date(start);
    start.setHours(0, 0, 0, 0);
    const adjustedEnd = new Date(end);
    adjustedEnd.setHours(23, 59, 59, 999);

    // First get all unique sales managers from bookings
    const salesManagers = await ClientBooking.distinct("salesManager", {
      date: { $gte: adjustedStart, $lte: adjustedEnd },
    });

    // Then perform aggregation for each sales manager
    const results = await Promise.all(
      salesManagers.map(async (salesManager) => {
        // Count bookings for this sales manager
        const bookingStats = await ClientBooking.aggregate([
          {
            $match: {
              date: { $gte: adjustedStart, $lte: adjustedEnd },
              salesManager: salesManager,
            },
          },
          {
            $group: {
              _id: null,
              totalBookings: {
                $sum: {
                  $cond: [{ $ne: ["$status", "canceled"] }, 1, 0],
                },
              },
              canceledBookings: {
                $sum: {
                  $cond: [{ $eq: ["$status", "canceled"] }, 1, 0],
                },
              },
            },
          },
        ]);

        // Count visits where this sales manager appears in source
        const visitCount = await Visit.countDocuments({
          date: { $gte: adjustedStart, $lte: adjustedEnd },
          source: { $regex: salesManager, $options: "i" }, // Case insensitive match
        });

        return {
          salesManager,
          totalBookings: bookingStats[0]?.totalBookings || 0,
          canceledBookings: bookingStats[0]?.canceledBookings || 0,
          totalVisits: visitCount,
        };
      }),
    );

    res.status(200).json({
      success: true,
      data: results as SalesManagerStats[],
      message: "Sales manager statistics retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching sales manager stats:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
