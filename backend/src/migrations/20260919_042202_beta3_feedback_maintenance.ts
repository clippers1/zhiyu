import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_sources_availability" AS ENUM('unchecked', 'available', 'changed', 'unavailable');
  CREATE TYPE "public"."enum__sources_v_version_availability" AS ENUM('unchecked', 'available', 'changed', 'unavailable');
  CREATE TYPE "public"."enum_feedback_category" AS ENUM('accuracy', 'source', 'clarity', 'experience');
  CREATE TYPE "public"."enum_feedback_status" AS ENUM('new', 'triaging', 'awaiting-review', 'resolved', 'dismissed');
  CREATE TABLE "feedback" (
    "id" serial PRIMARY KEY NOT NULL,
    "receipt_hash" varchar NOT NULL,
    "content_title" varchar NOT NULL,
    "kind" varchar NOT NULL,
    "slug" varchar NOT NULL,
    "channel" varchar NOT NULL,
    "publication_id" integer NOT NULL,
    "release_id" integer NOT NULL,
    "category" "enum_feedback_category" NOT NULL,
    "message" varchar NOT NULL,
    "status" "enum_feedback_status" DEFAULT 'new' NOT NULL,
    "assigned_to_id" integer,
    "public_reply" varchar,
    "internal_notes" varchar,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE "feedback_throttles" (
    "id" serial PRIMARY KEY NOT NULL,
    "key" varchar NOT NULL,
    "hits" numeric NOT NULL,
    "reset_at" timestamp(3) with time zone NOT NULL,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  ALTER TABLE "sources" ADD COLUMN "next_review_at" timestamp(3) with time zone;
  ALTER TABLE "sources" ADD COLUMN "availability" "enum_sources_availability" DEFAULT 'unchecked';
  ALTER TABLE "sources" ADD COLUMN "review_notes" varchar;
  ALTER TABLE "_sources_v" ADD COLUMN "version_next_review_at" timestamp(3) with time zone;
  ALTER TABLE "_sources_v" ADD COLUMN "version_availability" "enum__sources_v_version_availability" DEFAULT 'unchecked';
  ALTER TABLE "_sources_v" ADD COLUMN "version_review_notes" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "feedback_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "feedback_throttles_id" integer;
  ALTER TABLE "feedback" ADD CONSTRAINT "feedback_publication_id_publications_id_fk" FOREIGN KEY ("publication_id") REFERENCES "public"."publications"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "feedback" ADD CONSTRAINT "feedback_release_id_releases_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."releases"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "feedback" ADD CONSTRAINT "feedback_assigned_to_id_users_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE UNIQUE INDEX "feedback_receipt_hash_idx" ON "feedback" USING btree ("receipt_hash");
  CREATE INDEX "feedback_publication_idx" ON "feedback" USING btree ("publication_id");
  CREATE INDEX "feedback_release_idx" ON "feedback" USING btree ("release_id");
  CREATE INDEX "feedback_status_idx" ON "feedback" USING btree ("status");
  CREATE INDEX "feedback_assigned_to_idx" ON "feedback" USING btree ("assigned_to_id");
  CREATE INDEX "feedback_updated_at_idx" ON "feedback" USING btree ("updated_at");
  CREATE INDEX "feedback_created_at_idx" ON "feedback" USING btree ("created_at");
  CREATE UNIQUE INDEX "feedback_throttles_key_idx" ON "feedback_throttles" USING btree ("key");
  CREATE INDEX "feedback_throttles_reset_at_idx" ON "feedback_throttles" USING btree ("reset_at");
  CREATE INDEX "feedback_throttles_updated_at_idx" ON "feedback_throttles" USING btree ("updated_at");
  CREATE INDEX "feedback_throttles_created_at_idx" ON "feedback_throttles" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_feedback_fk" FOREIGN KEY ("feedback_id") REFERENCES "public"."feedback"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_feedback_throttles_fk" FOREIGN KEY ("feedback_throttles_id") REFERENCES "public"."feedback_throttles"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "sources_next_review_at_idx" ON "sources" USING btree ("next_review_at");
  CREATE INDEX "_sources_v_version_version_next_review_at_idx" ON "_sources_v" USING btree ("version_next_review_at");
  CREATE INDEX "payload_locked_documents_rels_feedback_id_idx" ON "payload_locked_documents_rels" USING btree ("feedback_id");
  CREATE INDEX "payload_locked_documents_rels_feedback_throttles_id_idx" ON "payload_locked_documents_rels" USING btree ("feedback_throttles_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "feedback" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "feedback_throttles" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_feedback_fk";

  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_feedback_throttles_fk";
  DROP TABLE "feedback" CASCADE;
  DROP TABLE "feedback_throttles" CASCADE;

  DROP INDEX "sources_next_review_at_idx";
  DROP INDEX "_sources_v_version_version_next_review_at_idx";
  DROP INDEX "payload_locked_documents_rels_feedback_id_idx";
  DROP INDEX "payload_locked_documents_rels_feedback_throttles_id_idx";
  ALTER TABLE "sources" DROP COLUMN "next_review_at";
  ALTER TABLE "sources" DROP COLUMN "availability";
  ALTER TABLE "sources" DROP COLUMN "review_notes";
  ALTER TABLE "_sources_v" DROP COLUMN "version_next_review_at";
  ALTER TABLE "_sources_v" DROP COLUMN "version_availability";
  ALTER TABLE "_sources_v" DROP COLUMN "version_review_notes";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "feedback_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "feedback_throttles_id";
  DROP TYPE "public"."enum_sources_availability";
  DROP TYPE "public"."enum__sources_v_version_availability";
  DROP TYPE "public"."enum_feedback_category";
  DROP TYPE "public"."enum_feedback_status";`)
}
