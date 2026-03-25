-- AlterTable
ALTER TABLE "users" ADD COLUMN "interests" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
