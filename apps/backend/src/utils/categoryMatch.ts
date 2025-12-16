import type PrismaClient  from "@trakx/db";

export async function matchCategory(prisma: typeof PrismaClient, userId : string , merchant: string) {
  if (!merchant) return null;

  const categories = await prisma.category.findMany({
    where: { userId },
  });

  merchant = merchant.toLowerCase();

  for (const category of categories) {
    for (const keyword of category.keywords) {
      if (merchant.includes(keyword.toLowerCase())) {
        return category.id;
      }
    }
  }
  return null;
}
