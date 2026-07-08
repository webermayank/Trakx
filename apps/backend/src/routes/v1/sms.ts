import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authMiddleware } from "../../middleware/auth.js";
import {
  classifySMSBatch,
  ingestSMS,
  ingestSMSBatch,
  ingestRateLimiter,
} from "../../controllers/sms.controller.js";
import {
  ingestPdf,
  confirmPdfImport,
  getPdfImportStatus,
  pdfUpload,
} from "../../controllers/pdf.controller.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const router = Router();

// All ingest routes require authentication
router.use(authMiddleware);

// ─── SMS ──────────────────────────────────────────────────────────────────────
router.post("/sms", ingestRateLimiter, ingestSMS);
router.post("/bulk-ingest-sms", ingestRateLimiter, ingestSMSBatch);
router.post("/classify", ingestRateLimiter, classifySMSBatch);

// ─── PDF Statement ────────────────────────────────────────────────────────────
router.post("/pdf", pdfUpload.single("file"), ingestPdf);
router.post("/pdf/:importId/confirm", confirmPdfImport);
router.get("/pdf/:importId", getPdfImportStatus);

export default router;
