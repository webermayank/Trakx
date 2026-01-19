import prisma  from '@trakx/db';
import { type Request, type Response } from 'express';

export const getSummary = async (req: Request, res: Response) => {
    const userId = req.user!.userId;

    const [total, last30Days] = await Promise.all([
        prisma.transaction.aggregate({
            where: { userId },
            _sum: { amount: true },
            _count: true,
        }),
        prisma.transaction.aggregate({
            where: {
                userId,
                date: {
                    gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                },
            },
            _sum: { amount: true },
        }),
    ]);

    res.json({
        totalSpent: total._sum.amount ?? 0,
        totalTransactions: total._count,
        last30DaysSpent: last30Days._sum.amount ?? 0,
    });
};

export const byCategory = async (req: Request, res: Response) => {
    const userId = req.user!.userId;

    const data = await prisma.transaction.groupBy({
        by: ["categoryId"],
        where: { userId },
        _sum: { amount: true },
    });

    const categories = await prisma.category.findMany({
        where: { userId },
    });

    const result = data.map(d => ({
        category:
            categories.find(c => c.id === d.categoryId)?.name ?? "Uncategorized",
        amount: d._sum.amount ?? 0,
    }));

    res.json(result);
};


export const monthly = async (req: Request, res: Response) => {
    const userId = req.user!.userId;

    const txns = await prisma.transaction.findMany({
        where: { userId },
        select: { amount: true, date: true },
    });

    const map = new Map<string, number>();

    txns.forEach(tx => {
        const key = `${tx.date.getFullYear()}-${tx.date.getMonth() + 1}`;
        map.set(key, (map.get(key) ?? 0) + tx.amount);
    });

    const result = Array.from(map.entries()).map(([month, amount]) => ({
        month,
        amount,
    }));

    res.json(result);
};


export const byAccount = async (req: Request, res: Response) => {
    const userId = req.user!.userId;

    const data = await prisma.transaction.groupBy({
        by: ["accountId"],
        where: { userId },
        _sum: { amount: true },
    });

    const accounts = await prisma.account.findMany({
        where: { userId },
    });

    const result = data.map(d => ({
        account:
            accounts.find(a => a.id === d.accountId)?.name ?? "Unknown",
        amount: d._sum.amount ?? 0,
    }));

    res.json(result);
};
