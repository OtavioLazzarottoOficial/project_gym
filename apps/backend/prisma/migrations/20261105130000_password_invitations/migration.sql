CREATE TABLE "password_invitations" (
  "id" TEXT NOT NULL,
  "membership_id" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMPTZ(3) NOT NULL,
  "used_at" TIMESTAMPTZ(3),
  CONSTRAINT "password_invitations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "password_invitations_membership_id_key" ON "password_invitations"("membership_id");
CREATE UNIQUE INDEX "password_invitations_token_hash_key" ON "password_invitations"("token_hash");
ALTER TABLE "password_invitations" ADD CONSTRAINT "password_invitations_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
