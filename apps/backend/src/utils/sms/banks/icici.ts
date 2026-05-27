import { COMMON_TRANSACTION_TEMPLATES } from "./common.js";
import { runTemplates } from "../templates.js";
import type { ParserContext, ParsedSmsResult } from "../types.js";

export function parseIciciSms(context: ParserContext): ParsedSmsResult | null {
  const result = runTemplates(context, COMMON_TRANSACTION_TEMPLATES);
  return result ? { ...result, parserUsed: "icici-template", bank: "ICICI" } : null;
}
