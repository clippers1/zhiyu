import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Long-form content: a third article kind, an explicit format switch, sections
// with nested paragraphs, FAQ entries and a figures list.
//
// `sections` and `faq` are Payload array fields, so they live in their own
// tables (with matching version tables) rather than in jsonb columns; `figures`
// is a single jsonb field. All new columns are nullable or defaulted so existing
// rows keep their current behaviour (entry-style indicator / organ page).
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TYPE "public"."enum_articles_format" AS ENUM('entry', 'article');
    CREATE TYPE "public"."enum__articles_v_version_format" AS ENUM('entry', 'article');
    ALTER TYPE "public"."enum_articles_kind" ADD VALUE IF NOT EXISTS 'story';
    ALTER TYPE "public"."enum__articles_v_version_kind" ADD VALUE IF NOT EXISTS 'story';`)
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "articles_sections" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "title" varchar,
      "short" varchar,
      "figure" varchar
    );
    CREATE TABLE IF NOT EXISTS "articles_sections_paragraphs" (
      "_order" integer NOT NULL,
      "_parent_id" varchar NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "text" varchar,
      "source_keys" varchar
    );
    CREATE TABLE IF NOT EXISTS "articles_faq" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "question" varchar,
      "answer" varchar,
      "source_keys" varchar
    );
    CREATE TABLE IF NOT EXISTS "_articles_v_version_sections" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" serial PRIMARY KEY NOT NULL,
      "title" varchar,
      "short" varchar,
      "figure" varchar,
      "_uuid" varchar
    );
    CREATE TABLE IF NOT EXISTS "_articles_v_version_sections_paragraphs" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" serial PRIMARY KEY NOT NULL,
      "text" varchar,
      "source_keys" varchar,
      "_uuid" varchar
    );
    CREATE TABLE IF NOT EXISTS "_articles_v_version_faq" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" serial PRIMARY KEY NOT NULL,
      "question" varchar,
      "answer" varchar,
      "source_keys" varchar,
      "_uuid" varchar
    );`)
  await db.execute(sql`
    ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "format" "enum_articles_format" DEFAULT 'entry';
    ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "figures" jsonb;
    ALTER TABLE "_articles_v" ADD COLUMN IF NOT EXISTS "version_format" "enum__articles_v_version_format" DEFAULT 'entry';
    ALTER TABLE "_articles_v" ADD COLUMN IF NOT EXISTS "version_figures" jsonb;`)
  await db.execute(sql`
    ALTER TABLE "articles_sections" ADD CONSTRAINT "articles_sections_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "articles_sections_paragraphs" ADD CONSTRAINT "articles_sections_paragraphs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."articles_sections"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "articles_faq" ADD CONSTRAINT "articles_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "_articles_v_version_sections" ADD CONSTRAINT "_articles_v_version_sections_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_articles_v"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "_articles_v_version_sections_paragraphs" ADD CONSTRAINT "_articles_v_version_sections_paragraphs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_articles_v_version_sections"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "_articles_v_version_faq" ADD CONSTRAINT "_articles_v_version_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_articles_v"("id") ON DELETE cascade ON UPDATE no action;`)
  await db.execute(sql`
    CREATE INDEX "articles_sections_order_idx" ON "articles_sections" USING btree ("_order");
    CREATE INDEX "articles_sections_parent_id_idx" ON "articles_sections" USING btree ("_parent_id");
    CREATE INDEX "articles_sections_paragraphs_order_idx" ON "articles_sections_paragraphs" USING btree ("_order");
    CREATE INDEX "articles_sections_paragraphs_parent_id_idx" ON "articles_sections_paragraphs" USING btree ("_parent_id");
    CREATE INDEX "articles_faq_order_idx" ON "articles_faq" USING btree ("_order");
    CREATE INDEX "articles_faq_parent_id_idx" ON "articles_faq" USING btree ("_parent_id");
    CREATE INDEX "_articles_v_version_sections_order_idx" ON "_articles_v_version_sections" USING btree ("_order");
    CREATE INDEX "_articles_v_version_sections_parent_id_idx" ON "_articles_v_version_sections" USING btree ("_parent_id");
    CREATE INDEX "_articles_v_version_sections_paragraphs_order_idx" ON "_articles_v_version_sections_paragraphs" USING btree ("_order");
    CREATE INDEX "_articles_v_version_sections_paragraphs_parent_id_idx" ON "_articles_v_version_sections_paragraphs" USING btree ("_parent_id");
    CREATE INDEX "_articles_v_version_faq_order_idx" ON "_articles_v_version_faq" USING btree ("_order");
    CREATE INDEX "_articles_v_version_faq_parent_id_idx" ON "_articles_v_version_faq" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE "articles_sections_paragraphs" CASCADE;
    DROP TABLE "articles_sections" CASCADE;
    DROP TABLE "articles_faq" CASCADE;
    DROP TABLE "_articles_v_version_sections_paragraphs" CASCADE;
    DROP TABLE "_articles_v_version_sections" CASCADE;
    DROP TABLE "_articles_v_version_faq" CASCADE;
    ALTER TABLE "articles" DROP COLUMN "format";
    ALTER TABLE "articles" DROP COLUMN "figures";
    ALTER TABLE "_articles_v" DROP COLUMN "version_format";
    ALTER TABLE "_articles_v" DROP COLUMN "version_figures";
    DROP TYPE "public"."enum_articles_format";
    DROP TYPE "public"."enum__articles_v_version_format";`)
  // PostgreSQL cannot remove a value from an enum; the extra 'story' value is
  // harmless once no row uses it, so the down migration leaves it in place.
}
