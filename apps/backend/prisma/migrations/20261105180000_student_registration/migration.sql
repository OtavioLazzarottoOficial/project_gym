-- AlterTable
ALTER TABLE "users" ADD COLUMN     "cpf" VARCHAR(11);

-- CreateTable
CREATE TABLE "students" (
    "id" TEXT NOT NULL,
    "membership_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "birth_date" DATE NOT NULL,
    "phone" VARCHAR(11) NOT NULL,
    "address_postal_code" TEXT,
    "address_street" TEXT,
    "address_number" TEXT,
    "address_neighborhood" TEXT,
    "address_city" TEXT,
    "address_state" TEXT,
    "address_complement" TEXT,
    "emergency_name" TEXT,
    "emergency_phone" TEXT,
    "emergency_relationship" TEXT,
    "guardian_name" TEXT,
    "guardian_phone" TEXT,
    "guardian_relationship" TEXT,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "students_membership_key" ON "students"("membership_id");

-- CreateIndex
CREATE INDEX "students_organization_idx" ON "students"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "students_membership_organization_key" ON "students"("membership_id", "organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_cpf_key" ON "users"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "branches_id_organization_key" ON "branches"("id", "organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "memberships_id_organization_key" ON "memberships"("id", "organization_id");

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_membership_id_organization_id_fkey" FOREIGN KEY ("membership_id", "organization_id") REFERENCES "memberships"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_branch_id_organization_id_fkey" FOREIGN KEY ("branch_id", "organization_id") REFERENCES "branches"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;
