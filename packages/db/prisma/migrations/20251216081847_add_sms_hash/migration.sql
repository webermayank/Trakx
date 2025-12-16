/*
  Warnings:

  - A unique constraint covering the columns `[smsHash]` on the table `Transaction` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "smsHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_smsHash_key" ON "Transaction"("smsHash");
