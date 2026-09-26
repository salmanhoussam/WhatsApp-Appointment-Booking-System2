-- CreateTable
CREATE TABLE "public"."resource_services" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "client_id" UUID NOT NULL,
    "resource_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resource_services_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "resource_services_client_id_service_id_idx" ON "public"."resource_services"("client_id", "service_id");

-- CreateIndex
CREATE INDEX "resource_services_client_id_resource_id_idx" ON "public"."resource_services"("client_id", "resource_id");

-- CreateIndex
CREATE UNIQUE INDEX "resource_services_resource_id_service_id_key" ON "public"."resource_services"("resource_id", "service_id");

-- AddForeignKey
ALTER TABLE "public"."resource_services" ADD CONSTRAINT "resource_services_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."resource_services" ADD CONSTRAINT "resource_services_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."resource_services" ADD CONSTRAINT "resource_services_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."catalog_services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

