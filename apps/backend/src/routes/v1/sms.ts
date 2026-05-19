import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.js";
import { ingestSMS, ingestSMSBatch } from "../../controllers/sms.controller.js";

const router = Router();

router.post("/ingest-sms", authMiddleware, ingestSMS);
router.post("/bulk-ingest-sms", authMiddleware, ingestSMSBatch);

export default router;
