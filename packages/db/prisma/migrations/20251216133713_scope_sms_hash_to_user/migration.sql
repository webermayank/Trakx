/*
  Warnings:

  - A unique constraint covering the columns `[userId,smsHash]` on the table `Transaction` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Transaction_smsHash_key";

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_userId_smsHash_key" ON "Transaction"("userId", "smsHash");
