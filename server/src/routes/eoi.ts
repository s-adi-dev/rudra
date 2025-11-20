import express from "express";
import EoiController from "../controllers/eoi";

const router = express.Router();

// Get all EOIs with filters and pagination
router.get("/", EoiController.getAllEoi);

// Get single EOI by ID
router.get("/:id", EoiController.getEoiById);

// Create new EOI
router.post("/", EoiController.createEoi);

// Update EOI by ID
router.put("/:id", EoiController.updateEoi);

// Delete EOI by ID
router.delete("/:id", EoiController.deleteEoi);

export default router;
