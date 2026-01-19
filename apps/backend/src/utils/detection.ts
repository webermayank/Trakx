import type PrismaClient  from "@trakx/db";


export async function detectAccount(
  prisma: typeof PrismaClient,
  userId: string,
  sms: string
): Promise<string | null> {
  const accounts = await prisma.account.findMany({
    where: { userId },
    select: { id: true, name: true },
  });

  // Try matching by last 4 digits 
  const digitsMatch = sms.match(/\b(\d{4})\b/);

  if (digitsMatch) {
    const lastFour = digitsMatch[1] as string;

    // match against account name if user stored digits in name
    const acc = accounts.find((a) => a.name.toLowerCase().includes(lastFour));

    if (acc) return acc.id;
  }

  //  Try matching by account/bank name
  const lowerSms = sms.toLowerCase();

  for (const acc of accounts) {
    if (lowerSms.includes(acc.name.toLowerCase())) {
      return acc.id;
    }
  }

  return null; // fallback
}
