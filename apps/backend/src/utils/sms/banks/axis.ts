import { COMMON_TRANSACTION_TEMPLATES } from "./common.js";
import { runTemplates } from "../templates.js";
import type { ParserContext, ParsedSmsResult } from "../types.js";

export function parseAxisSms(context: ParserContext): ParsedSmsResult | null {
  const result = runTemplates(context, COMMON_TRANSACTION_TEMPLATES);
  return result ? { ...result, parserUsed: "axis-template", bank: "AXIS" } : null;
}
