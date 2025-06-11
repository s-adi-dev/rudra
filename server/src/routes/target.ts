import express from "express";
import { getSalesManagerStats } from "../controllers/target";

const router = express.Router();

router.get("/range-stats", getSalesManagerStats);

export default router;
