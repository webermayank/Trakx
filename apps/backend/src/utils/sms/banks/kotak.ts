import { COMMON_TRANSACTION_TEMPLATES } from "./common.js";
import { runTemplates } from "../templates.js";
import type { ParserContext, ParsedSmsResult } from "../types.js";

export function parseKotakSms(context: ParserContext): ParsedSmsResult | null {
  const result = runTemplates(context, COMMON_TRANSACTION_TEMPLATES);
  return result ? { ...result, parserUsed: "kotak-template", bank: "KOTAK" } : null;
}
