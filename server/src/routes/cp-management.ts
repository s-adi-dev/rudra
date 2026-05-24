// routes/cp-management.ts
import express from "express";
import CPManagementController from "../controllers/cp-management";
import verifyToken from "../utils/jwt";

const router = express.Router();

// Merge two client partners
router.post(
  "/merge-cp",
  verifyToken,
  CPManagementController.mergeClientPartners,
);

// Merge two CP employees
router.post(
  "/merge-employees",
  verifyToken,
  CPManagementController.mergeEmployees,
);

// Transfer a single employee to a different client partner
router.post(
  "/transfer-employee",
  verifyToken,
  CPManagementController.transferEmployee,
);

// Get potential merge candidates for client partners
router.get(
  "/cp-merge-candidates/:cpId",
  verifyToken,
  CPManagementController.getClientPartnerMergeCandidates,
);

// Get potential merge candidates for employees
router.get(
  "/employee-merge-candidates/:employeeId",
  verifyToken,
  CPManagementController.getEmployeeMergeCandidates,
);

export default router;
