import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.js";
import { ingestSMS } from "../../controllers/sms.controller.js";

const router = Router();

router.post("/ingest-sms", authMiddleware, ingestSMS);

export default router;
