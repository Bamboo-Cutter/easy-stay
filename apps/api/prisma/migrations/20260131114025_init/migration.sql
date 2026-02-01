-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('MERCHANT', 'ADMIN');

-- CreateEnum
CREATE TYPE "hotel_status" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'OFFLINE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "user_role" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotels" (
    "id" TEXT NOT NULL,
    "name_cn" TEXT NOT NULL,
    "name_en" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "star" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "open_year" INTEGER NOT NULL,
    "status" "hotel_status" NOT NULL DEFAULT 'DRAFT',
    "reject_reason" TEXT,
    "merchant_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hotels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotel_images" (
    "id" TEXT NOT NULL,
    "hotel_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "hotel_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotel_tags" (
    "id" TEXT NOT NULL,
    "hotel_id" TEXT NOT NULL,
    "tag" TEXT NOT NULL,

    CONSTRAINT "hotel_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" TEXT NOT NULL,
    "hotel_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "base_price" INTEGER NOT NULL,
    "refundable" BOOLEAN NOT NULL DEFAULT false,
    "breakfast" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_calendar" (
    "id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "price" INTEGER NOT NULL,
    "promo_type" TEXT,
    "promo_value" INTEGER,

    CONSTRAINT "price_calendar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nearby_points" (
    "id" TEXT NOT NULL,
    "hotel_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "distance_km" DOUBLE PRECISION,

    CONSTRAINT "nearby_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_summary" (
    "id" TEXT NOT NULL,
    "hotel_id" TEXT NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "review_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "review_summary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "hotels_city_idx" ON "hotels"("city");

-- CreateIndex
CREATE INDEX "hotels_merchant_id_idx" ON "hotels"("merchant_id");

-- CreateIndex
CREATE INDEX "hotel_images_hotel_id_idx" ON "hotel_images"("hotel_id");

-- CreateIndex
CREATE INDEX "hotel_tags_hotel_id_idx" ON "hotel_tags"("hotel_id");

-- CreateIndex
CREATE UNIQUE INDEX "hotel_tags_hotel_id_tag_key" ON "hotel_tags"("hotel_id", "tag");

-- CreateIndex
CREATE INDEX "rooms_hotel_id_idx" ON "rooms"("hotel_id");

-- CreateIndex
CREATE INDEX "price_calendar_date_idx" ON "price_calendar"("date");

-- CreateIndex
CREATE UNIQUE INDEX "price_calendar_room_id_date_key" ON "price_calendar"("room_id", "date");

-- CreateIndex
CREATE INDEX "nearby_points_hotel_id_idx" ON "nearby_points"("hotel_id");

-- CreateIndex
CREATE UNIQUE INDEX "review_summary_hotel_id_key" ON "review_summary"("hotel_id");

-- AddForeignKey
ALTER TABLE "hotels" ADD CONSTRAINT "hotels_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_images" ADD CONSTRAINT "hotel_images_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_tags" ADD CONSTRAINT "hotel_tags_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_calendar" ADD CONSTRAINT "price_calendar_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nearby_points" ADD CONSTRAINT "nearby_points_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_summary" ADD CONSTRAINT "review_summary_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
