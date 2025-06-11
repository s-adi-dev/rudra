import { NextFunction, Request, Response } from "express";
import { Client } from "../models/client";
import ClientBooking from "../models/clientBooking";
import createError from "../utils/createError";

type StatusKey = "hot" | "warm" | "cold" | "lost" | "booked";

function isValidStatus(status: string): status is StatusKey {
  return ["hot", "warm", "cold", "lost", "booked"].includes(status);
}

class analyticsController {
  async getClientStatusCounts(req: Request, res: Response, next: NextFunction) {
    try {
      // Extract query parameters for potential filtering
      const { startDate, endDate, manager } = req.query;

      // Build date filter if dates are provided
      let dateFilter: any = {};
      if (startDate || endDate) {
        dateFilter = {};
        if (startDate) {
          const start = new Date(startDate as string);
          start.setHours(0, 0, 0, 0);
          dateFilter.$gte = start;
        }
        if (endDate) {
          const end = new Date(endDate as string);
          end.setHours(23, 59, 59, 999);
          dateFilter.$lte = end;
        }
      }

      // Build manager filter if manager is provided
      let managerFilter: any = {};
      if (manager) {
        managerFilter = {
          $or: [
            { source: manager },
            // { relation: manager },
            // { closing: manager },
          ],
        };
      }

      // Build aggregation pipeline
      const pipeline: any[] = [
        // Lookup visits for each client
        {
          $lookup: {
            from: "visits", // Collection name for visits
            localField: "visits",
            foreignField: "_id",
            as: "visitData",
          },
        },
        // Filter out clients with no visits
        {
          $match: {
            visitData: { $ne: [] },
          },
        },
        // Unwind visits to work with them individually
        {
          $unwind: "$visitData",
        },
        // Apply manager filter if provided
        ...(Object.keys(managerFilter).length > 0
          ? [
              {
                $match: {
                  $expr: {
                    $or:
                      managerFilter.$or?.map((condition: any) => {
                        const field = Object.keys(condition)[0];
                        return {
                          $eq: [`$visitData.${field}`, condition[field]],
                        };
                      }) || [],
                  },
                },
              },
            ]
          : []),
        // Apply date filter if provided
        ...(Object.keys(dateFilter).length > 0
          ? [
              {
                $match: {
                  "visitData.date": dateFilter,
                },
              },
            ]
          : []),
        // Sort visits by date descending to get latest visit per client
        {
          $sort: {
            "visitData.date": -1,
          },
        },
        // Group by client to get only the latest visit
        {
          $group: {
            _id: "$_id",
            latestVisit: { $first: "$visitData" },
          },
        },
        // Group by status to count occurrences
        {
          $group: {
            _id: "$latestVisit.status",
            count: { $sum: 1 },
          },
        },
        // Project to match expected output format
        {
          $project: {
            status: "$_id",
            count: 1,
            _id: 0,
          },
        },
      ];

      const results = (await Client.aggregate(pipeline)) as {
        status: string;
        count: number;
      }[];

      // Initialize the status counts
      const statusCounts = {
        hot: 0,
        warm: 0,
        cold: 0,
        lost: 0,
        booked: 0,
      };

      // Fill in the counts from aggregation results
      results.forEach((result: { status: string; count: number }) => {
        if (isValidStatus(result.status)) {
          statusCounts[result.status] = result.count;
        }
      });

      res.status(200).json(statusCounts);
    } catch (error) {
      next(
        createError(
          500,
          error instanceof Error
            ? error.message
            : "Failed to fetch client status analytics",
        ),
      );
    }
  }

  async getYearlyBookingStats(req: Request, res: Response, next: NextFunction) {
    try {
      // Extract the year from query parameters, default to current year
      const year =
        parseInt(req.query.year as string) || new Date().getFullYear();

      // Create date range for the specified year
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31, 23, 59, 59, 999);

      // Optionally filter by manager if provided
      const { manager } = req.query;
      let managerFilter: any = {};
      if (manager) {
        managerFilter = {
          $or: [
            { source: manager },
            // { relation: manager },
            // { closing: manager },
          ],
        };
      }

      // Aggregation pipeline for client visits
      const clientPipeline: any[] = [
        // Lookup visits for each client
        {
          $lookup: {
            from: "visits",
            localField: "visits",
            foreignField: "_id",
            as: "visitData",
          },
        },
        // Unwind visits
        {
          $unwind: "$visitData",
        },
        // Match visits within date range and manager filter
        {
          $match: {
            "visitData.date": { $gte: startDate, $lte: endDate },
            ...(Object.keys(managerFilter).length > 0 && {
              $expr: {
                $or:
                  managerFilter.$or?.map((condition: any) => {
                    const field = Object.keys(condition)[0];
                    return { $eq: [`$visitData.${field}`, condition[field]] };
                  }) || [],
              },
            }),
          },
        },
        // Sort by date descending
        {
          $sort: {
            "visitData.date": -1,
          },
        },
        // Group by client to get latest visit only
        {
          $group: {
            _id: "$_id",
            latestVisit: { $first: "$visitData" },
          },
        },
        // Group by month and count clients
        {
          $group: {
            _id: { $month: "$latestVisit.date" },
            clientCount: { $sum: 1 },
          },
        },
        // Project to format output
        {
          $project: {
            month: "$_id",
            client: "$clientCount",
            _id: 0,
          },
        },
        // Sort by month
        {
          $sort: { month: 1 },
        },
      ];

      // Aggregation pipeline for bookings
      const bookingPipeline: any[] = [
        // Match bookings within date range and not canceled
        {
          $match: {
            date: { $gte: startDate, $lte: endDate },
            status: { $ne: "canceled" },
            ...(manager && { salesManager: manager }),
          },
        },
        // Group by month and count bookings
        {
          $group: {
            _id: { $month: "$date" },
            bookingCount: { $sum: 1 },
          },
        },
        // Project to format output
        {
          $project: {
            month: "$_id",
            booking: "$bookingCount",
            _id: 0,
          },
        },
        // Sort by month
        {
          $sort: { month: 1 },
        },
      ];

      // Execute both aggregations
      const [clientResults, bookingResults] = await Promise.all([
        Client.aggregate(clientPipeline) as Promise<
          { month: number; client: number }[]
        >,
        ClientBooking.aggregate(bookingPipeline) as Promise<
          { month: number; booking: number }[]
        >,
      ]);

      // Initialize monthly statistics array
      const monthlyStats = Array(12)
        .fill(0)
        .map(() => ({
          client: 0,
          booking: 0,
        }));

      // Fill in client counts
      clientResults.forEach((result) => {
        monthlyStats[result.month - 1].client = result.client;
      });

      // Fill in booking counts
      bookingResults.forEach((result) => {
        monthlyStats[result.month - 1].booking = result.booking;
      });

      // Format the response with month names
      const monthNames = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ];

      // Filter out months with no clients
      const formattedResponse = monthlyStats
        .map((stats, index) => ({
          month: monthNames[index],
          client: stats.client,
          booking: stats.booking,
        }))
        .filter((month) => month.client > 0);

      // Calculate summary totals
      const totalClients = formattedResponse.reduce(
        (sum, month) => sum + month.client,
        0,
      );

      const totalBookings = formattedResponse.reduce(
        (sum, month) => sum + month.booking,
        0,
      );

      // Calculate average booking rate
      const averageBookingRate =
        totalClients > 0 ? (totalBookings / totalClients) * 100 : 0;

      res.status(200).json({
        year,
        monthlyStats: formattedResponse,
        summary: {
          totalClientsForYear: totalClients,
          totalBookingsForYear: totalBookings,
          averageBookingRate: averageBookingRate,
        },
      });
    } catch (error) {
      next(
        createError(
          500,
          error instanceof Error
            ? error.message
            : "Failed to fetch yearly booking statistics",
        ),
      );
    }
  }

  async getYearlyRegistrationStats(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      // Extract the year from query parameters, default to current year
      const year =
        parseInt(req.query.year as string) || new Date().getFullYear();

      // Create date range for the specified year
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31, 23, 59, 59, 999);

      // Optionally filter by manager if provided
      const { manager } = req.query;
      let managerFilter: any = {};
      if (manager) {
        managerFilter = { salesManager: manager };
      }

      // Define booking statuses
      const bookingStatuses = [
        "booked",
        "cnc",
        "registeration-process",
        "loan-process",
      ];

      // Aggregation pipeline for all statistics
      const pipeline: any[] = [
        // Match bookings within date range and manager filter
        {
          $match: {
            date: { $gte: startDate, $lte: endDate },
            ...managerFilter,
          },
        },
        // Group by month and status
        {
          $group: {
            _id: {
              month: { $month: "$date" },
              status: "$status",
            },
            count: { $sum: 1 },
          },
        },
        // Group by month to aggregate all status counts
        {
          $group: {
            _id: "$_id.month",
            statusCounts: {
              $push: {
                status: "$_id.status",
                count: "$count",
              },
            },
          },
        },
        // Project to calculate booking, registration, and canceled counts
        {
          $project: {
            month: "$_id",
            booking: {
              $sum: {
                $map: {
                  input: "$statusCounts",
                  as: "sc",
                  in: {
                    $cond: [
                      { $in: ["$$sc.status", bookingStatuses] },
                      "$$sc.count",
                      0,
                    ],
                  },
                },
              },
            },
            registration: {
              $sum: {
                $map: {
                  input: "$statusCounts",
                  as: "sc",
                  in: {
                    $cond: [
                      { $eq: ["$$sc.status", "registered"] },
                      "$$sc.count",
                      0,
                    ],
                  },
                },
              },
            },
            canceled: {
              $sum: {
                $map: {
                  input: "$statusCounts",
                  as: "sc",
                  in: {
                    $cond: [
                      { $eq: ["$$sc.status", "canceled"] },
                      "$$sc.count",
                      0,
                    ],
                  },
                },
              },
            },
            _id: 0,
          },
        },
        // Sort by month
        {
          $sort: { month: 1 },
        },
      ];

      const results = (await ClientBooking.aggregate(pipeline)) as {
        month: number;
        booking: number;
        registration: number;
        canceled: number;
      }[];

      // Initialize monthly statistics array
      const monthlyStats = Array(12)
        .fill(0)
        .map(() => ({
          booking: 0,
          registration: 0,
          canceled: 0,
        }));

      // Fill in the results
      results.forEach((result) => {
        monthlyStats[result.month - 1] = {
          booking: result.booking,
          registration: result.registration,
          canceled: result.canceled,
        };
      });

      // Format the response with month names
      const monthNames = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ];

      // Include all months (don't filter out months with 0 activity)
      const formattedResponse = monthlyStats.map((stats, index) => ({
        month: monthNames[index],
        booking: stats.booking,
        registration: stats.registration,
        canceled: stats.canceled,
      }));

      // Calculate summary totals using aggregation
      const summaryPipeline: any[] = [
        {
          $match: {
            date: { $gte: startDate, $lte: endDate },
            ...managerFilter,
          },
        },
        {
          $group: {
            _id: null,
            totalBookings: {
              $sum: {
                $cond: [{ $in: ["$status", bookingStatuses] }, 1, 0],
              },
            },
            totalRegistrations: {
              $sum: {
                $cond: [{ $eq: ["$status", "registered"] }, 1, 0],
              },
            },
            totalCanceled: {
              $sum: {
                $cond: [{ $eq: ["$status", "canceled"] }, 1, 0],
              },
            },
          },
        },
      ];

      const summaryResult = (await ClientBooking.aggregate(
        summaryPipeline,
      )) as {
        totalBookings: number;
        totalRegistrations: number;
        totalCanceled: number;
      }[];
      const summary = summaryResult[0] || {
        totalBookings: 0,
        totalRegistrations: 0,
        totalCanceled: 0,
      };

      // Calculate total potential registrations
      const totalPotentialRegistrations =
        summary.totalBookings + summary.totalCanceled;

      res.status(200).json({
        year,
        monthlyStats: formattedResponse,
        summary: {
          totalBookingsForYear: summary.totalBookings,
          totalRegistrationsForYear: summary.totalRegistrations,
          totalCanceledForYear: summary.totalCanceled,
          totalPotentialRegistrations: totalPotentialRegistrations,
          registrationRate:
            Math.round(
              (summary.totalRegistrations /
                (summary.totalRegistrations + totalPotentialRegistrations)) *
                10000,
            ) / 100,
        },
      });
    } catch (error) {
      next(
        createError(
          500,
          error instanceof Error
            ? error.message
            : "Failed to fetch yearly registration statistics",
        ),
      );
    }
  }
}

export default new analyticsController();
