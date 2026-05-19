export function parseSMS(sms: string) {
  let amount = null;
  let merchant = null;
  let paymentMethod = null;
  let isTransactional = false;

  const negativePatterns = [
    /\brecharge\b/i,
    /\bvalidity\b/i,
    /\bunlimited calls\b/i,
    /\bdata\b/i,
    /\bdue on\b/i,
    /\bwill be processed\b/i,
    /\bcollect request\b/i,
    /\bmandate\b/i,
    /\bipo\b/i,
    /\bblocking of funds\b/i,
    /\botp\b/i,
    /\boffer\b/i,
  ];

  const positivePatterns = [
    /\bdebited\b/i,
    /\bcredited\b/i,
    /\bwithdrawn\b/i,
    /\bspent\b/i,
    /\breceived\b/i,
    /\bupi\b/i,
    /\bpaid\b/i,
    /\bpayment of rs\b/i,
    /\btxn\b/i,
    /\btransaction\b/i,
    /\bpos\b/i,
    /\bcard ending\b/i,
  ];

  if (negativePatterns.some((pattern) => pattern.test(sms))) {
    return {
      amount,
      merchant,
      paymentMethod,
      isTransactional,
    };
  }

  // Amount detection
  const amountRegex = /(?:Rs\.?|INR|₹)\s?([\d,]+\.?\d*)/i;
  const amountMatch = sms.match(amountRegex);
  if (amountMatch) {
    amount = parseFloat(amountMatch[1]!.replace(/,/g, ""));
  }

  // Merchant detection - temp
  const merchantRegex = /at\s([A-Za-z0-9\s\-]+)/i;
  const merchantMatch = sms.match(merchantRegex);
  if (merchantMatch) {
    merchant = merchantMatch[1]!.trim();
  }

  // Payment method detection (UPI / card)
  if (/UPI/i.test(sms)) paymentMethod = "UPI";
  else if (/debited/i.test(sms) || /POS/i.test(sms)) paymentMethod = "CARD";
  else paymentMethod = "BANK";

  isTransactional = amount !== null && positivePatterns.some((pattern) => pattern.test(sms));

  return {
    amount,
    merchant,
    paymentMethod,
    isTransactional,
  };
}
