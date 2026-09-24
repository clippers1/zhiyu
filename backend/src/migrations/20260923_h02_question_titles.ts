import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "articles" ADD COLUMN "question" varchar;
  ALTER TABLE "articles" ADD COLUMN "question_answer" varchar;
  ALTER TABLE "_articles_v" ADD COLUMN "version_question" varchar;
  ALTER TABLE "_articles_v" ADD COLUMN "version_question_answer" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "articles" DROP COLUMN "question";
  ALTER TABLE "articles" DROP COLUMN "question_answer";
  ALTER TABLE "_articles_v" DROP COLUMN "version_question";
  ALTER TABLE "_articles_v" DROP COLUMN "version_question_answer";`)
}