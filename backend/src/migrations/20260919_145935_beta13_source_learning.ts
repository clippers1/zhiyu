import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_articles_content_risk" AS ENUM('foundational', 'clinical');
  CREATE TYPE "public"."enum__articles_v_version_content_risk" AS ENUM('foundational', 'clinical');
  CREATE TYPE "public"."enum_releases_publication_basis" AS ENUM('professional-review', 'source-curated');
  ALTER TABLE "articles" ADD COLUMN "content_risk" "enum_articles_content_risk" DEFAULT 'clinical';
  ALTER TABLE "articles" ADD COLUMN "learning" jsonb;
  ALTER TABLE "_articles_v" ADD COLUMN "version_content_risk" "enum__articles_v_version_content_risk" DEFAULT 'clinical';
  ALTER TABLE "_articles_v" ADD COLUMN "version_learning" jsonb;
  ALTER TABLE "releases" ADD COLUMN "publication_basis" "enum_releases_publication_basis" DEFAULT 'professional-review';
  ALTER TABLE "releases" ADD COLUMN "source_check_notes" varchar;
  ALTER TABLE "releases" ADD COLUMN "source_check_by_id" integer;
  ALTER TABLE "releases" ADD COLUMN "source_checked_at" timestamp(3) with time zone;
  ALTER TABLE "releases" ADD CONSTRAINT "releases_source_check_by_id_users_id_fk" FOREIGN KEY ("source_check_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "releases_source_check_by_idx" ON "releases" USING btree ("source_check_by_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "releases" DROP CONSTRAINT "releases_source_check_by_id_users_id_fk";
  
  DROP INDEX "releases_source_check_by_idx";
  ALTER TABLE "articles" DROP COLUMN "content_risk";
  ALTER TABLE "articles" DROP COLUMN "learning";
  ALTER TABLE "_articles_v" DROP COLUMN "version_content_risk";
  ALTER TABLE "_articles_v" DROP COLUMN "version_learning";
  ALTER TABLE "releases" DROP COLUMN "publication_basis";
  ALTER TABLE "releases" DROP COLUMN "source_check_notes";
  ALTER TABLE "releases" DROP COLUMN "source_check_by_id";
  ALTER TABLE "releases" DROP COLUMN "source_checked_at";
  DROP TYPE "public"."enum_articles_content_risk";
  DROP TYPE "public"."enum__articles_v_version_content_risk";
  DROP TYPE "public"."enum_releases_publication_basis";`)
}
