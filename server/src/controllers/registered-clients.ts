// src/controllers/registered-clients.ts
import { NextFunction, Request, Response } from "express";
import BookingLedger, { PaymentType } from "../models/booking-ledger";
import ClientBooking from "../models/clientBooking";
import createError from "../utils/createError";

interface RegisteredClientData {
  clientId: string;
  date: Date;
  registrationDate?: Date | null;
  name: string;
  unit: string;
  wing?: string;
  agreementValue: number;
  receivedAmount: number;
}

export class RegisteredClientsController {
  /**
   * Get all registered clients for a specific project with their payment details
   */
  async getRegisteredClientsByProject(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { project } = req.params;
      const { includeStatuses } = req.query;

      if (!project) {
        next(createError(400, "Project name is required"));
        return;
      }

      // Determine which statuses to include
      // By default, only include 'registered' status
      // If includeStatuses is provided, use those
      let statusFilter: string[] = ["registered"];

      if (includeStatuses) {
        const statuses = (includeStatuses as string).split(",");
        // Validate statuses
        const validStatuses = [
          "registered",
          "registeration-process",
          "loan-process",
          "booked",
          "cnc",
        ];
        statusFilter = statuses.filter((s) => validStatuses.includes(s.trim()));

        if (statusFilter.length === 0) {
          next(createError(400, "No valid statuses provided"));
          return;
        }
      }

      // Find all registered clients for the project
      const registeredClients = await ClientBooking.find({
        project: project,
        status: { $in: statusFilter },
      })
        .populate({
          path: "unit",
          select: "unitNumber",
          model: "Unit",
        })
        .sort({ date: -1 });

      if (registeredClients.length === 0) {
        res.status(200).json({
          success: true,
          project: project,
          totalClients: 0,
          totalAgreementValue: 0,
          totalReceivedAmount: 0,
          data: [],
        });
        return;
      }

      // Get client IDs for payment lookup
      const clientIds = registeredClients.map((client) => client._id);

      // Fetch all payments for these clients (excluding deleted and refunds)
      const paymentsAggregation = await BookingLedger.aggregate([
        {
          $match: {
            clientId: { $in: clientIds },
            isDeleted: false,
          },
        },
        {
          $group: {
            _id: "$clientId",
            totalReceived: {
              $sum: {
                $cond: [
                  {
                    $in: [
                      "$type",
                      [
                        PaymentType.SCHEDULE_PAYMENT,
                        PaymentType.ADVANCE,
                        PaymentType.ADJUSTMENT,
                      ],
                    ],
                  },
                  "$amount",
                  0,
                ],
              },
            },
            totalRefunds: {
              $sum: {
                $cond: [{ $eq: ["$type", PaymentType.REFUND] }, "$amount", 0],
              },
            },
          },
        },
        {
          $project: {
            _id: 1,
            netReceived: {
              $subtract: ["$totalReceived", "$totalRefunds"],
            },
          },
        },
      ]);

      // Create a map for quick payment lookup
      const paymentMap = new Map<string, number>();
      paymentsAggregation.forEach((payment) => {
        paymentMap.set(payment._id.toString(), payment.netReceived);
      });

      // Build the response data
      const clientsData: RegisteredClientData[] = registeredClients.map(
        (client) => {
          const clientIdStr = client._id.toString();
          const receivedAmount = paymentMap.get(clientIdStr) || 0;

          // Get unit number safely
          let unitNumber = "N/A";
          if (
            client.unit &&
            typeof client.unit === "object" &&
            "unitNumber" in client.unit
          ) {
            unitNumber = (client.unit as any).unitNumber;
          }

          return {
            clientId: clientIdStr,
            date: client.date,
            registrationDate: client.registrationDate || null,
            name: client.applicant,
            unit: unitNumber,
            wing: client.wing,
            agreementValue: client.agreementValue,
            receivedAmount: receivedAmount,
          };
        },
      );

      // Calculate totals
      const totals = clientsData.reduce(
        (acc, client) => ({
          totalAgreementValue: acc.totalAgreementValue + client.agreementValue,
          totalReceivedAmount: acc.totalReceivedAmount + client.receivedAmount,
        }),
        {
          totalAgreementValue: 0,
          totalReceivedAmount: 0,
        },
      );

      res.status(200).json({
        success: true,
        project: project,
        totalClients: clientsData.length,
        ...totals,
        data: clientsData,
      });
    } catch (error) {
      next(
        createError(
          500,
          error instanceof Error
            ? error.message
            : "Error fetching registered clients",
        ),
      );
    }
  }

  /**
   * Get registered clients summary for all projects
   */
  async getAllProjectsSummary(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { includeStatuses } = req.query;

      // Determine which statuses to include
      let statusFilter: string[] = ["registered"];

      if (includeStatuses) {
        const statuses = (includeStatuses as string).split(",");
        const validStatuses = [
          "registered",
          "registeration-process",
          "loan-process",
          "booked",
          "cnc",
        ];
        statusFilter = statuses.filter((s) => validStatuses.includes(s.trim()));

        if (statusFilter.length === 0) {
          next(createError(400, "No valid statuses provided"));
          return;
        }
      }

      // Get all unique projects with registered clients
      const projects = await ClientBooking.distinct("project", {
        status: { $in: statusFilter },
      });

      if (projects.length === 0) {
        res.status(200).json({
          success: true,
          totalProjects: 0,
          data: [],
        });
        return;
      }

      // Fetch summary for each project
      const projectsSummary = await Promise.all(
        projects.map(async (projectName) => {
          // Get all registered clients for this project
          const clients = await ClientBooking.find({
            project: projectName,
            status: { $in: statusFilter },
          });

          const clientIds = clients.map((client) => client._id);

          // Calculate total agreement value
          const totalAgreementValue = clients.reduce(
            (sum, client) => sum + client.agreementValue,
            0,
          );

          // Fetch payments for these clients
          const paymentsAggregation = await BookingLedger.aggregate([
            {
              $match: {
                clientId: { $in: clientIds },
                isDeleted: false,
              },
            },
            {
              $group: {
                _id: null,
                totalReceived: {
                  $sum: {
                    $cond: [
                      {
                        $in: [
                          "$type",
                          [
                            PaymentType.SCHEDULE_PAYMENT,
                            PaymentType.ADVANCE,
                            PaymentType.ADJUSTMENT,
                          ],
                        ],
                      },
                      "$amount",
                      0,
                    ],
                  },
                },
                totalRefunds: {
                  $sum: {
                    $cond: [
                      { $eq: ["$type", PaymentType.REFUND] },
                      "$amount",
                      0,
                    ],
                  },
                },
              },
            },
          ]);

          const netReceived =
            paymentsAggregation.length > 0
              ? paymentsAggregation[0].totalReceived -
                paymentsAggregation[0].totalRefunds
              : 0;

          return {
            project: projectName,
            totalClients: clients.length,
            totalAgreementValue: totalAgreementValue,
            totalReceivedAmount: netReceived,
            totalPendingAmount: totalAgreementValue - netReceived,
          };
        }),
      );

      // Calculate grand totals
      const grandTotals = projectsSummary.reduce(
        (acc, project) => ({
          totalClients: acc.totalClients + project.totalClients,
          totalAgreementValue:
            acc.totalAgreementValue + project.totalAgreementValue,
          totalReceivedAmount:
            acc.totalReceivedAmount + project.totalReceivedAmount,
          totalPendingAmount:
            acc.totalPendingAmount + project.totalPendingAmount,
        }),
        {
          totalClients: 0,
          totalAgreementValue: 0,
          totalReceivedAmount: 0,
          totalPendingAmount: 0,
        },
      );

      res.status(200).json({
        success: true,
        totalProjects: projects.length,
        grandTotals,
        data: projectsSummary,
      });
    } catch (error) {
      next(
        createError(
          500,
          error instanceof Error
            ? error.message
            : "Error fetching projects summary",
        ),
      );
    }
  }
}

export default new RegisteredClientsController();
