-- AlterTable
ALTER TABLE "hotels"
ALTER COLUMN "open_year" TYPE TIMESTAMP(3)
USING to_date("open_year"::text, 'YYYY')::timestamp(3);
