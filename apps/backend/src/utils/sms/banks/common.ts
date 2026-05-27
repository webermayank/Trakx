import { buildBaseExtract } from "../extractors.js";
import type { TransactionTemplate } from "../types.js";

export const COMMON_TRANSACTION_TEMPLATES: TransactionTemplate[] = [
  {
    id: "upi-debit",
    regex:
      /\b(?:a\/c|account).{0,30}\bdebited\b.{0,40}(?:Rs\.?|INR|₹)\s*(?<amount>[\d,]+(?:\.\d{1,2})?).{0,60}UPI(?:\/P2[AM]\/(?<merchant>[^/\n]+))?/i,
    direction: "debit",
    paymentMethod: "UPI",
    confidence: 0.9,
    parserUsed: "generic-template",
    extract: (context, match) => buildBaseExtract(context, match),
  },
  {
    id: "upi-credit",
    regex:
      /\b(?:credited|received)\b.{0,40}(?:Rs\.?|INR|₹)\s*(?<amount>[\d,]+(?:\.\d{1,2})?).{0,60}UPI(?:\/P2[AM]\/(?<merchant>[^/\n]+))?/i,
    direction: "credit",
    paymentMethod: "UPI",
    confidence: 0.9,
    parserUsed: "generic-template",
    extract: (context, match) => buildBaseExtract(context, match),
  },
  {
    id: "card-purchase",
    regex:
      /\b(?:purchase|spent|debited|used)\b.{0,40}(?:Rs\.?|INR|₹)\s*(?<amount>[\d,]+(?:\.\d{1,2})?).{0,60}\bat\s+(?<merchant>[A-Za-z0-9&.\- ]{2,40}).{0,40}(?:card|pos)/i,
    direction: "debit",
    paymentMethod: "CARD",
    confidence: 0.88,
    parserUsed: "generic-template",
    extract: (context, match) => buildBaseExtract(context, match),
  },
  {
    id: "atm-withdrawal",
    regex:
      /\b(?:cash withdrawal|withdrawn)\b.{0,40}(?:Rs\.?|INR|₹)\s*(?<amount>[\d,]+(?:\.\d{1,2})?).{0,60}(?:atm|cash)/i,
    direction: "debit",
    paymentMethod: "ATM",
    confidence: 0.9,
    parserUsed: "generic-template",
    extract: (context, match) => buildBaseExtract(context, match),
  },
  {
    id: "imps-credit",
    regex:
      /\bcredited\b.{0,40}(?:Rs\.?|INR|₹)\s*(?<amount>[\d,]+(?:\.\d{1,2})?).{0,80}\bIMPS\b/i,
    direction: "credit",
    paymentMethod: "IMPS",
    confidence: 0.9,
    parserUsed: "generic-template",
    extract: (context, match) => buildBaseExtract(context, match),
  },
  {
    id: "neft-credit",
    regex:
      /\bcredited\b.{0,40}(?:Rs\.?|INR|₹)\s*(?<amount>[\d,]+(?:\.\d{1,2})?).{0,80}\bNEFT\b/i,
    direction: "credit",
    paymentMethod: "NEFT",
    confidence: 0.9,
    parserUsed: "generic-template",
    extract: (context, match) => buildBaseExtract(context, match),
  },
  {
    id: "rtgs-credit",
    regex:
      /\bcredited\b.{0,40}(?:Rs\.?|INR|₹)\s*(?<amount>[\d,]+(?:\.\d{1,2})?).{0,80}\bRTGS\b/i,
    direction: "credit",
    paymentMethod: "RTGS",
    confidence: 0.9,
    parserUsed: "generic-template",
    extract: (context, match) => buildBaseExtract(context, match),
  },
  {
    id: "salary-credit",
    regex:
      /\b(?:salary|payroll)\b.{0,40}\bcredited\b.{0,40}(?:Rs\.?|INR|₹)\s*(?<amount>[\d,]+(?:\.\d{1,2})?)/i,
    direction: "credit",
    paymentMethod: "BANK",
    confidence: 0.94,
    parserUsed: "generic-template",
    category: "Salary",
    extract: (context, match) => buildBaseExtract(context, match),
  },
  {
    id: "fastag-deduction",
    regex:
      /\bfastag\b.{0,40}\b(?:deducted|debited)\b.{0,40}(?:Rs\.?|INR|₹)\s*(?<amount>[\d,]+(?:\.\d{1,2})?)/i,
    direction: "debit",
    paymentMethod: "FASTAG",
    confidence: 0.9,
    parserUsed: "generic-template",
    category: "Transport",
    extract: (context, match) => buildBaseExtract(context, match),
  },
  {
    id: "wallet-debit",
    regex:
      /\b(?:wallet|paytm wallet|amazon pay wallet)\b.{0,50}\b(?:paid|debited)\b.{0,40}(?:Rs\.?|INR|₹)\s*(?<amount>[\d,]+(?:\.\d{1,2})?)/i,
    direction: "debit",
    paymentMethod: "WALLET",
    confidence: 0.86,
    parserUsed: "generic-template",
    extract: (context, match) => buildBaseExtract(context, match),
  },
  {
    id: "subscription-debit",
    regex:
      /\bpayment of\b.{0,20}(?:Rs\.?|INR|₹)\s*(?<amount>[\d,]+(?:\.\d{1,2})?)\b.{0,80}\bfor\b\s+(?<merchant>[A-Za-z0-9&.\- ]{2,40}).{0,80}\bprocessed successfully\b/i,
    direction: "debit",
    paymentMethod: "CARD",
    confidence: 0.9,
    parserUsed: "generic-template",
    category: "Subscriptions",
    extract: (context, match) => buildBaseExtract(context, match),
  },
];
