export function parseSMS(sms: string) {
  let amount = null;
  let merchant = null;
  let paymentMethod = null;

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

  return {
    amount,
    merchant,
    paymentMethod,
  };
}
