-- AlterTable
ALTER TABLE "BookableProduct" ADD COLUMN     "countryCodes" TEXT,
ADD COLUMN     "countryMode" TEXT NOT NULL DEFAULT 'ALL';
