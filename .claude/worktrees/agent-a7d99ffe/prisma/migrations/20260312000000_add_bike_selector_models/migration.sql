-- AlterEnum
ALTER TYPE "XpEvent" ADD VALUE 'bike_quiz_completed';

-- CreateTable
CREATE TABLE "quiz_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "sessionToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quiz_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_answers" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "stepKey" TEXT NOT NULL,
    "answerValue" JSONB NOT NULL,

    CONSTRAINT "quiz_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_results" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT,
    "primaryCategory" INTEGER NOT NULL,
    "rawScore" DOUBLE PRECISION NOT NULL,
    "categoryName" TEXT NOT NULL,
    "resultJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quiz_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bike_spectrum_categories" (
    "id" TEXT NOT NULL,
    "categoryNumber" INTEGER NOT NULL,
    "categoryName" TEXT NOT NULL,
    "categoryDescription" TEXT NOT NULL,
    "travelRange" TEXT,
    "recommendedWheelConfig" TEXT NOT NULL,
    "recommendedSizes" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bike_spectrum_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bike_brands" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bike_brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bike_brand_models" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "categoryNumber" INTEGER NOT NULL,
    "modelName" TEXT NOT NULL,
    "priceRange" TEXT,
    "productUrl" TEXT,
    "availableSizes" JSONB NOT NULL,
    "keySpecs" JSONB,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bike_brand_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bike_consultation_requests" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "ridingGoals" TEXT NOT NULL,
    "specificQuestions" TEXT,
    "budgetRange" TEXT,
    "quizSessionId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bike_consultation_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "quiz_sessions_sessionToken_key" ON "quiz_sessions"("sessionToken");

-- CreateIndex
CREATE INDEX "quiz_sessions_userId_idx" ON "quiz_sessions"("userId");

-- CreateIndex
CREATE INDEX "quiz_sessions_sessionToken_idx" ON "quiz_sessions"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "quiz_answers_sessionId_stepKey_key" ON "quiz_answers"("sessionId", "stepKey");

-- CreateIndex
CREATE INDEX "quiz_answers_sessionId_idx" ON "quiz_answers"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "quiz_results_sessionId_key" ON "quiz_results"("sessionId");

-- CreateIndex
CREATE INDEX "quiz_results_userId_idx" ON "quiz_results"("userId");

-- CreateIndex
CREATE INDEX "quiz_results_createdAt_idx" ON "quiz_results"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "bike_spectrum_categories_categoryNumber_key" ON "bike_spectrum_categories"("categoryNumber");

-- CreateIndex
CREATE UNIQUE INDEX "bike_brands_slug_key" ON "bike_brands"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "bike_brand_models_brandId_categoryNumber_modelName_key" ON "bike_brand_models"("brandId", "categoryNumber", "modelName");

-- CreateIndex
CREATE INDEX "bike_brand_models_brandId_idx" ON "bike_brand_models"("brandId");

-- CreateIndex
CREATE INDEX "bike_brand_models_categoryNumber_idx" ON "bike_brand_models"("categoryNumber");

-- CreateIndex
CREATE INDEX "bike_consultation_requests_userId_idx" ON "bike_consultation_requests"("userId");

-- CreateIndex
CREATE INDEX "bike_consultation_requests_status_idx" ON "bike_consultation_requests"("status");

-- AddForeignKey
ALTER TABLE "quiz_sessions" ADD CONSTRAINT "quiz_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_answers" ADD CONSTRAINT "quiz_answers_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "quiz_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_results" ADD CONSTRAINT "quiz_results_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "quiz_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_results" ADD CONSTRAINT "quiz_results_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bike_brand_models" ADD CONSTRAINT "bike_brand_models_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "bike_brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bike_consultation_requests" ADD CONSTRAINT "bike_consultation_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
