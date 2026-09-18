import express from "express";
import {
  floorController,
  projectController,
  unitController,
} from "../controllers/inventory";
import verifyToken from "../utils/jwt";
import requirePermission from "../utils/requirePermission";

const router = express.Router();

router.use(verifyToken);

// Project routes
router.post("/project", projectController.createProject);
router.get("/project", projectController.getAllProjects);
router.get("/project-structure", projectController.getProjectsStructure);
router.get("/project/name", projectController.getProjectByName);
router.get("/project/:projectId", projectController.getProjectById);
router.put("/project/:projectId", projectController.updateProject);
router.delete("/project/:projectId", projectController.deleteProject);

// Floor routes
router.post(
  "/floor",
  requirePermission("Inventory", "create-floor"),
  floorController.createFloor,
);

// Unit routes
router.post("/unit", unitController.createUnit);
router.get("/unit", unitController.getAllUnits);
router.get("/unit/:id", unitController.getUnitById);
router.put("/unit/:id", unitController.updateUnit);
router.patch("/unit/:id/status", unitController.updateUnitStatus);
router.delete("/unit/:id", unitController.deleteUnit);

export default router;
