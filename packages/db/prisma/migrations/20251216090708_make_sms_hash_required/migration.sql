/*
  Warnings:

  - Made the column `smsHash` on table `Transaction` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Transaction" ALTER COLUMN "smsHash" SET NOT NULL;
