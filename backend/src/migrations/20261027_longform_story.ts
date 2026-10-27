import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Long-form content: a third article kind, an explicit format switch, sections,
// FAQ entries and a figures list. Every new column is nullable so existing rows
// keep their current behaviour (entry-style indicator / organ page).
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TYPE "public"."enum_articles_kind" ADD VALUE IF NOT EXISTS 'story';
    ALTER TYPE "public"."enum__articles_v_version_kind" ADD VALUE IF NOT EXISTS 'story';`)
  await db.execute(sql`
    CREATE TYPE "public"."enum_articles_format" AS ENUM('entry', 'article');
    ALTER TABLE "articles" ADD COLUMN "format" "enum_articles_format" DEFAULT 'entry';
    ALTER TABLE "articles" ADD COLUMN "sections" jsonb;
    ALTER TABLE "articles" ADD COLUMN "faq" jsonb;
    ALTER TABLE "articles" ADD COLUMN "figures" jsonb;
    ALTER TABLE "_articles_v" ADD COLUMN "version_format" "enum_articles_format" DEFAULT 'entry';
    ALTER TABLE "_articles_v" ADD COLUMN "version_sections" jsonb;
    ALTER TABLE "_articles_v" ADD COLUMN "version_faq" jsonb;
    ALTER TABLE "_articles_v" ADD COLUMN "version_figures" jsonb;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "articles" DROP COLUMN "format";
    ALTER TABLE "articles" DROP COLUMN "sections";
    ALTER TABLE "articles" DROP COLUMN "faq";
    ALTER TABLE "articles" DROP COLUMN "figures";
    ALTER TABLE "_articles_v" DROP COLUMN "version_format";
    ALTER TABLE "_articles_v" DROP COLUMN "version_sections";
    ALTER TABLE "_articles_v" DROP COLUMN "version_faq";
    ALTER TABLE "_articles_v" DROP COLUMN "version_figures";
    DROP TYPE "public"."enum_articles_format";`)
  // PostgreSQL cannot remove a value from an enum; the extra 'story' value is
  // harmless once no row uses it, so the down migration leaves it in place.
}
