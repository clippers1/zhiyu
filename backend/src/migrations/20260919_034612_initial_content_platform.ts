import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_users_roles" AS ENUM('admin', 'editor', 'reviewer', 'publisher');
  CREATE TYPE "public"."enum_sources_source_type" AS ENUM('机构健康科普', '指南/共识', '系统综述', '其他');
  CREATE TYPE "public"."enum_sources_language" AS ENUM('zh', 'en', 'other');
  CREATE TYPE "public"."enum_sources_license_status" AS ENUM('unverified', 'citation-only', 'licensed', 'open');
  CREATE TYPE "public"."enum__sources_v_version_source_type" AS ENUM('机构健康科普', '指南/共识', '系统综述', '其他');
  CREATE TYPE "public"."enum__sources_v_version_language" AS ENUM('zh', 'en', 'other');
  CREATE TYPE "public"."enum__sources_v_version_license_status" AS ENUM('unverified', 'citation-only', 'licensed', 'open');
  CREATE TYPE "public"."enum_articles_kind" AS ENUM('indicator', 'organ');
  CREATE TYPE "public"."enum_articles_icon" AS ENUM('droplet', 'heart-pulse', 'layers', 'heart');
  CREATE TYPE "public"."enum_articles_color" AS ENUM('orange', 'purple', 'blue', 'green');
  CREATE TYPE "public"."enum__articles_v_version_kind" AS ENUM('indicator', 'organ');
  CREATE TYPE "public"."enum__articles_v_version_icon" AS ENUM('droplet', 'heart-pulse', 'layers', 'heart');
  CREATE TYPE "public"."enum__articles_v_version_color" AS ENUM('orange', 'purple', 'blue', 'green');
  CREATE TYPE "public"."enum_reviews_decision" AS ENUM('approved', 'changes-requested');
  CREATE TYPE "public"."enum_releases_channel" AS ENUM('official', 'demo');
  CREATE TABLE "users_roles" (
    "order" integer NOT NULL,
    "parent_id" integer NOT NULL,
    "value" "enum_users_roles",
    "id" serial PRIMARY KEY NOT NULL
  );

  CREATE TABLE "users_sessions" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "created_at" timestamp(3) with time zone,
    "expires_at" timestamp(3) with time zone NOT NULL
  );

  CREATE TABLE "users" (
    "id" serial PRIMARY KEY NOT NULL,
    "name" varchar NOT NULL,
    "professional_title" varchar,
    "qualification_verified" boolean DEFAULT false,
    "qualification_notes" varchar,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "email" varchar NOT NULL,
    "reset_password_token" varchar,
    "reset_password_expiration" timestamp(3) with time zone,
    "salt" varchar,
    "hash" varchar,
    "reset_password_requested_at" timestamp(3) with time zone,
    "login_attempts" numeric DEFAULT 0,
    "lock_until" timestamp(3) with time zone
  );

  CREATE TABLE "categories" (
    "id" serial PRIMARY KEY NOT NULL,
    "slug" varchar NOT NULL,
    "name" varchar NOT NULL,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE "sources" (
    "id" serial PRIMARY KEY NOT NULL,
    "title" varchar NOT NULL,
    "publisher" varchar NOT NULL,
    "url" varchar NOT NULL,
    "source_type" "enum_sources_source_type" DEFAULT '机构健康科普' NOT NULL,
    "language" "enum_sources_language" DEFAULT 'en' NOT NULL,
    "region" varchar,
    "edition" varchar,
    "publication_date" timestamp(3) with time zone,
    "checked_at" timestamp(3) with time zone NOT NULL,
    "license_status" "enum_sources_license_status" DEFAULT 'unverified' NOT NULL,
    "license_notes" varchar,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE "_sources_v" (
    "id" serial PRIMARY KEY NOT NULL,
    "parent_id" integer,
    "version_title" varchar NOT NULL,
    "version_publisher" varchar NOT NULL,
    "version_url" varchar NOT NULL,
    "version_source_type" "enum__sources_v_version_source_type" DEFAULT '机构健康科普' NOT NULL,
    "version_language" "enum__sources_v_version_language" DEFAULT 'en' NOT NULL,
    "version_region" varchar,
    "version_edition" varchar,
    "version_publication_date" timestamp(3) with time zone,
    "version_checked_at" timestamp(3) with time zone NOT NULL,
    "version_license_status" "enum__sources_v_version_license_status" DEFAULT 'unverified' NOT NULL,
    "version_license_notes" varchar,
    "version_updated_at" timestamp(3) with time zone,
    "version_created_at" timestamp(3) with time zone,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE "articles_tags" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "text" varchar NOT NULL
  );

  CREATE TABLE "articles_metrics" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "name" varchar,
    "text" varchar,
    "source_keys" varchar
  );

  CREATE TABLE "articles_chain" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "text" varchar
  );

  CREATE TABLE "articles_citations" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "key" varchar NOT NULL,
    "source_id" integer NOT NULL,
    "scope" varchar NOT NULL,
    "locator" varchar
  );

  CREATE TABLE "articles" (
    "id" serial PRIMARY KEY NOT NULL,
    "key" varchar,
    "kind" "enum_articles_kind" NOT NULL,
    "slug" varchar NOT NULL,
    "title" varchar NOT NULL,
    "subtitle" varchar NOT NULL,
    "english" varchar,
    "category" varchar NOT NULL,
    "aliases" varchar,
    "applicability" varchar NOT NULL,
    "limitations" varchar,
    "scope_confirmed" boolean DEFAULT false,
    "description" varchar NOT NULL,
    "description_source_keys" varchar,
    "chain_source_keys" varchar,
    "tip" varchar,
    "tip_source_keys" varchar,
    "organ_label" varchar,
    "featured" boolean DEFAULT false,
    "icon" "enum_articles_icon" DEFAULT 'heart',
    "color" "enum_articles_color" DEFAULT 'green',
    "number" varchar,
    "last_edited_by_id" integer,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE "articles_rels" (
    "id" serial PRIMARY KEY NOT NULL,
    "order" integer,
    "parent_id" integer NOT NULL,
    "path" varchar NOT NULL,
    "articles_id" integer
  );

  CREATE TABLE "_articles_v_version_tags" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" serial PRIMARY KEY NOT NULL,
    "text" varchar NOT NULL,
    "_uuid" varchar
  );

  CREATE TABLE "_articles_v_version_metrics" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" serial PRIMARY KEY NOT NULL,
    "name" varchar,
    "text" varchar,
    "source_keys" varchar,
    "_uuid" varchar
  );

  CREATE TABLE "_articles_v_version_chain" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" serial PRIMARY KEY NOT NULL,
    "text" varchar,
    "_uuid" varchar
  );

  CREATE TABLE "_articles_v_version_citations" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" serial PRIMARY KEY NOT NULL,
    "key" varchar NOT NULL,
    "source_id" integer NOT NULL,
    "scope" varchar NOT NULL,
    "locator" varchar,
    "_uuid" varchar
  );

  CREATE TABLE "_articles_v" (
    "id" serial PRIMARY KEY NOT NULL,
    "parent_id" integer,
    "version_key" varchar,
    "version_kind" "enum__articles_v_version_kind" NOT NULL,
    "version_slug" varchar NOT NULL,
    "version_title" varchar NOT NULL,
    "version_subtitle" varchar NOT NULL,
    "version_english" varchar,
    "version_category" varchar NOT NULL,
    "version_aliases" varchar,
    "version_applicability" varchar NOT NULL,
    "version_limitations" varchar,
    "version_scope_confirmed" boolean DEFAULT false,
    "version_description" varchar NOT NULL,
    "version_description_source_keys" varchar,
    "version_chain_source_keys" varchar,
    "version_tip" varchar,
    "version_tip_source_keys" varchar,
    "version_organ_label" varchar,
    "version_featured" boolean DEFAULT false,
    "version_icon" "enum__articles_v_version_icon" DEFAULT 'heart',
    "version_color" "enum__articles_v_version_color" DEFAULT 'green',
    "version_number" varchar,
    "version_last_edited_by_id" integer,
    "version_updated_at" timestamp(3) with time zone,
    "version_created_at" timestamp(3) with time zone,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE "_articles_v_rels" (
    "id" serial PRIMARY KEY NOT NULL,
    "order" integer,
    "parent_id" integer NOT NULL,
    "path" varchar NOT NULL,
    "articles_id" integer
  );

  CREATE TABLE "reviews" (
    "id" serial PRIMARY KEY NOT NULL,
    "article_id" integer NOT NULL,
    "decision" "enum_reviews_decision" NOT NULL,
    "notes" varchar NOT NULL,
    "reviewer_id" integer,
    "content_hash" varchar,
    "snapshot" jsonb,
    "reviewer_display" jsonb,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE "releases" (
    "id" serial PRIMARY KEY NOT NULL,
    "article_id" integer NOT NULL,
    "channel" "enum_releases_channel" DEFAULT 'official' NOT NULL,
    "review_id" integer,
    "label" varchar,
    "kind" varchar,
    "slug" varchar,
    "content_hash" varchar,
    "public_data" jsonb,
    "summary" jsonb,
    "created_by_id" integer,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE "publications" (
    "id" serial PRIMARY KEY NOT NULL,
    "release_id" integer NOT NULL,
    "withdrawn" boolean DEFAULT false,
    "reason" varchar NOT NULL,
    "key" varchar,
    "title" varchar,
    "channel" varchar,
    "kind" varchar,
    "slug" varchar,
    "category" varchar,
    "search_text" varchar,
    "featured" boolean,
    "summary" jsonb,
    "public_data" jsonb,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE "audit_events" (
    "id" serial PRIMARY KEY NOT NULL,
    "action" varchar NOT NULL,
    "target" varchar NOT NULL,
    "detail" varchar,
    "actor_id" integer,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE "payload_kv" (
    "id" serial PRIMARY KEY NOT NULL,
    "key" varchar NOT NULL,
    "data" jsonb NOT NULL
  );

  CREATE TABLE "payload_locked_documents" (
    "id" serial PRIMARY KEY NOT NULL,
    "global_slug" varchar,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE "payload_locked_documents_rels" (
    "id" serial PRIMARY KEY NOT NULL,
    "order" integer,
    "parent_id" integer NOT NULL,
    "path" varchar NOT NULL,
    "users_id" integer,
    "categories_id" integer,
    "sources_id" integer,
    "articles_id" integer,
    "reviews_id" integer,
    "releases_id" integer,
    "publications_id" integer,
    "audit_events_id" integer
  );

  CREATE TABLE "payload_preferences" (
    "id" serial PRIMARY KEY NOT NULL,
    "key" varchar,
    "value" jsonb,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE "payload_preferences_rels" (
    "id" serial PRIMARY KEY NOT NULL,
    "order" integer,
    "parent_id" integer NOT NULL,
    "path" varchar NOT NULL,
    "users_id" integer
  );

  CREATE TABLE "payload_migrations" (
    "id" serial PRIMARY KEY NOT NULL,
    "name" varchar,
    "batch" numeric,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  ALTER TABLE "users_roles" ADD CONSTRAINT "users_roles_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_sources_v" ADD CONSTRAINT "_sources_v_parent_id_sources_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."sources"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "articles_tags" ADD CONSTRAINT "articles_tags_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "articles_metrics" ADD CONSTRAINT "articles_metrics_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "articles_chain" ADD CONSTRAINT "articles_chain_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "articles_citations" ADD CONSTRAINT "articles_citations_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "articles_citations" ADD CONSTRAINT "articles_citations_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "articles" ADD CONSTRAINT "articles_last_edited_by_id_users_id_fk" FOREIGN KEY ("last_edited_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "articles_rels" ADD CONSTRAINT "articles_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "articles_rels" ADD CONSTRAINT "articles_rels_articles_fk" FOREIGN KEY ("articles_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_articles_v_version_tags" ADD CONSTRAINT "_articles_v_version_tags_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_articles_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_articles_v_version_metrics" ADD CONSTRAINT "_articles_v_version_metrics_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_articles_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_articles_v_version_chain" ADD CONSTRAINT "_articles_v_version_chain_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_articles_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_articles_v_version_citations" ADD CONSTRAINT "_articles_v_version_citations_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articles_v_version_citations" ADD CONSTRAINT "_articles_v_version_citations_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_articles_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_articles_v" ADD CONSTRAINT "_articles_v_parent_id_articles_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articles_v" ADD CONSTRAINT "_articles_v_version_last_edited_by_id_users_id_fk" FOREIGN KEY ("version_last_edited_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articles_v_rels" ADD CONSTRAINT "_articles_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_articles_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_articles_v_rels" ADD CONSTRAINT "_articles_v_rels_articles_fk" FOREIGN KEY ("articles_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "reviews" ADD CONSTRAINT "reviews_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "releases" ADD CONSTRAINT "releases_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "releases" ADD CONSTRAINT "releases_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "releases" ADD CONSTRAINT "releases_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "publications" ADD CONSTRAINT "publications_release_id_releases_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."releases"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_sources_fk" FOREIGN KEY ("sources_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_articles_fk" FOREIGN KEY ("articles_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_reviews_fk" FOREIGN KEY ("reviews_id") REFERENCES "public"."reviews"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_releases_fk" FOREIGN KEY ("releases_id") REFERENCES "public"."releases"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_publications_fk" FOREIGN KEY ("publications_id") REFERENCES "public"."publications"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_audit_events_fk" FOREIGN KEY ("audit_events_id") REFERENCES "public"."audit_events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_roles_order_idx" ON "users_roles" USING btree ("order");
  CREATE INDEX "users_roles_parent_idx" ON "users_roles" USING btree ("parent_id");
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE UNIQUE INDEX "categories_slug_idx" ON "categories" USING btree ("slug");
  CREATE INDEX "categories_updated_at_idx" ON "categories" USING btree ("updated_at");
  CREATE INDEX "categories_created_at_idx" ON "categories" USING btree ("created_at");
  CREATE UNIQUE INDEX "sources_url_idx" ON "sources" USING btree ("url");
  CREATE INDEX "sources_updated_at_idx" ON "sources" USING btree ("updated_at");
  CREATE INDEX "sources_created_at_idx" ON "sources" USING btree ("created_at");
  CREATE INDEX "_sources_v_parent_idx" ON "_sources_v" USING btree ("parent_id");
  CREATE INDEX "_sources_v_version_version_url_idx" ON "_sources_v" USING btree ("version_url");
  CREATE INDEX "_sources_v_version_version_updated_at_idx" ON "_sources_v" USING btree ("version_updated_at");
  CREATE INDEX "_sources_v_version_version_created_at_idx" ON "_sources_v" USING btree ("version_created_at");
  CREATE INDEX "_sources_v_created_at_idx" ON "_sources_v" USING btree ("created_at");
  CREATE INDEX "_sources_v_updated_at_idx" ON "_sources_v" USING btree ("updated_at");
  CREATE INDEX "articles_tags_order_idx" ON "articles_tags" USING btree ("_order");
  CREATE INDEX "articles_tags_parent_id_idx" ON "articles_tags" USING btree ("_parent_id");
  CREATE INDEX "articles_metrics_order_idx" ON "articles_metrics" USING btree ("_order");
  CREATE INDEX "articles_metrics_parent_id_idx" ON "articles_metrics" USING btree ("_parent_id");
  CREATE INDEX "articles_chain_order_idx" ON "articles_chain" USING btree ("_order");
  CREATE INDEX "articles_chain_parent_id_idx" ON "articles_chain" USING btree ("_parent_id");
  CREATE INDEX "articles_citations_order_idx" ON "articles_citations" USING btree ("_order");
  CREATE INDEX "articles_citations_parent_id_idx" ON "articles_citations" USING btree ("_parent_id");
  CREATE INDEX "articles_citations_source_idx" ON "articles_citations" USING btree ("source_id");
  CREATE UNIQUE INDEX "articles_key_idx" ON "articles" USING btree ("key");
  CREATE INDEX "articles_last_edited_by_idx" ON "articles" USING btree ("last_edited_by_id");
  CREATE INDEX "articles_updated_at_idx" ON "articles" USING btree ("updated_at");
  CREATE INDEX "articles_created_at_idx" ON "articles" USING btree ("created_at");
  CREATE INDEX "articles_rels_order_idx" ON "articles_rels" USING btree ("order");
  CREATE INDEX "articles_rels_parent_idx" ON "articles_rels" USING btree ("parent_id");
  CREATE INDEX "articles_rels_path_idx" ON "articles_rels" USING btree ("path");
  CREATE INDEX "articles_rels_articles_id_idx" ON "articles_rels" USING btree ("articles_id");
  CREATE INDEX "_articles_v_version_tags_order_idx" ON "_articles_v_version_tags" USING btree ("_order");
  CREATE INDEX "_articles_v_version_tags_parent_id_idx" ON "_articles_v_version_tags" USING btree ("_parent_id");
  CREATE INDEX "_articles_v_version_metrics_order_idx" ON "_articles_v_version_metrics" USING btree ("_order");
  CREATE INDEX "_articles_v_version_metrics_parent_id_idx" ON "_articles_v_version_metrics" USING btree ("_parent_id");
  CREATE INDEX "_articles_v_version_chain_order_idx" ON "_articles_v_version_chain" USING btree ("_order");
  CREATE INDEX "_articles_v_version_chain_parent_id_idx" ON "_articles_v_version_chain" USING btree ("_parent_id");
  CREATE INDEX "_articles_v_version_citations_order_idx" ON "_articles_v_version_citations" USING btree ("_order");
  CREATE INDEX "_articles_v_version_citations_parent_id_idx" ON "_articles_v_version_citations" USING btree ("_parent_id");
  CREATE INDEX "_articles_v_version_citations_source_idx" ON "_articles_v_version_citations" USING btree ("source_id");
  CREATE INDEX "_articles_v_parent_idx" ON "_articles_v" USING btree ("parent_id");
  CREATE INDEX "_articles_v_version_version_key_idx" ON "_articles_v" USING btree ("version_key");
  CREATE INDEX "_articles_v_version_version_last_edited_by_idx" ON "_articles_v" USING btree ("version_last_edited_by_id");
  CREATE INDEX "_articles_v_version_version_updated_at_idx" ON "_articles_v" USING btree ("version_updated_at");
  CREATE INDEX "_articles_v_version_version_created_at_idx" ON "_articles_v" USING btree ("version_created_at");
  CREATE INDEX "_articles_v_created_at_idx" ON "_articles_v" USING btree ("created_at");
  CREATE INDEX "_articles_v_updated_at_idx" ON "_articles_v" USING btree ("updated_at");
  CREATE INDEX "_articles_v_rels_order_idx" ON "_articles_v_rels" USING btree ("order");
  CREATE INDEX "_articles_v_rels_parent_idx" ON "_articles_v_rels" USING btree ("parent_id");
  CREATE INDEX "_articles_v_rels_path_idx" ON "_articles_v_rels" USING btree ("path");
  CREATE INDEX "_articles_v_rels_articles_id_idx" ON "_articles_v_rels" USING btree ("articles_id");
  CREATE INDEX "reviews_article_idx" ON "reviews" USING btree ("article_id");
  CREATE INDEX "reviews_reviewer_idx" ON "reviews" USING btree ("reviewer_id");
  CREATE INDEX "reviews_updated_at_idx" ON "reviews" USING btree ("updated_at");
  CREATE INDEX "reviews_created_at_idx" ON "reviews" USING btree ("created_at");
  CREATE INDEX "releases_article_idx" ON "releases" USING btree ("article_id");
  CREATE INDEX "releases_review_idx" ON "releases" USING btree ("review_id");
  CREATE INDEX "releases_created_by_idx" ON "releases" USING btree ("created_by_id");
  CREATE INDEX "releases_updated_at_idx" ON "releases" USING btree ("updated_at");
  CREATE INDEX "releases_created_at_idx" ON "releases" USING btree ("created_at");
  CREATE INDEX "publications_release_idx" ON "publications" USING btree ("release_id");
  CREATE UNIQUE INDEX "publications_key_idx" ON "publications" USING btree ("key");
  CREATE INDEX "publications_channel_idx" ON "publications" USING btree ("channel");
  CREATE INDEX "publications_kind_idx" ON "publications" USING btree ("kind");
  CREATE INDEX "publications_slug_idx" ON "publications" USING btree ("slug");
  CREATE INDEX "publications_category_idx" ON "publications" USING btree ("category");
  CREATE INDEX "publications_updated_at_idx" ON "publications" USING btree ("updated_at");
  CREATE INDEX "publications_created_at_idx" ON "publications" USING btree ("created_at");
  CREATE INDEX "audit_events_actor_idx" ON "audit_events" USING btree ("actor_id");
  CREATE INDEX "audit_events_updated_at_idx" ON "audit_events" USING btree ("updated_at");
  CREATE INDEX "audit_events_created_at_idx" ON "audit_events" USING btree ("created_at");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_categories_id_idx" ON "payload_locked_documents_rels" USING btree ("categories_id");
  CREATE INDEX "payload_locked_documents_rels_sources_id_idx" ON "payload_locked_documents_rels" USING btree ("sources_id");
  CREATE INDEX "payload_locked_documents_rels_articles_id_idx" ON "payload_locked_documents_rels" USING btree ("articles_id");
  CREATE INDEX "payload_locked_documents_rels_reviews_id_idx" ON "payload_locked_documents_rels" USING btree ("reviews_id");
  CREATE INDEX "payload_locked_documents_rels_releases_id_idx" ON "payload_locked_documents_rels" USING btree ("releases_id");
  CREATE INDEX "payload_locked_documents_rels_publications_id_idx" ON "payload_locked_documents_rels" USING btree ("publications_id");
  CREATE INDEX "payload_locked_documents_rels_audit_events_id_idx" ON "payload_locked_documents_rels" USING btree ("audit_events_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "users_roles" CASCADE;
  DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "categories" CASCADE;
  DROP TABLE "sources" CASCADE;
  DROP TABLE "_sources_v" CASCADE;
  DROP TABLE "articles_tags" CASCADE;
  DROP TABLE "articles_metrics" CASCADE;
  DROP TABLE "articles_chain" CASCADE;
  DROP TABLE "articles_citations" CASCADE;
  DROP TABLE "articles" CASCADE;
  DROP TABLE "articles_rels" CASCADE;
  DROP TABLE "_articles_v_version_tags" CASCADE;
  DROP TABLE "_articles_v_version_metrics" CASCADE;
  DROP TABLE "_articles_v_version_chain" CASCADE;
  DROP TABLE "_articles_v_version_citations" CASCADE;
  DROP TABLE "_articles_v" CASCADE;
  DROP TABLE "_articles_v_rels" CASCADE;
  DROP TABLE "reviews" CASCADE;
  DROP TABLE "releases" CASCADE;
  DROP TABLE "publications" CASCADE;
  DROP TABLE "audit_events" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TYPE "public"."enum_users_roles";
  DROP TYPE "public"."enum_sources_source_type";
  DROP TYPE "public"."enum_sources_language";
  DROP TYPE "public"."enum_sources_license_status";
  DROP TYPE "public"."enum__sources_v_version_source_type";
  DROP TYPE "public"."enum__sources_v_version_language";
  DROP TYPE "public"."enum__sources_v_version_license_status";
  DROP TYPE "public"."enum_articles_kind";
  DROP TYPE "public"."enum_articles_icon";
  DROP TYPE "public"."enum_articles_color";
  DROP TYPE "public"."enum__articles_v_version_kind";
  DROP TYPE "public"."enum__articles_v_version_icon";
  DROP TYPE "public"."enum__articles_v_version_color";
  DROP TYPE "public"."enum_reviews_decision";
  DROP TYPE "public"."enum_releases_channel";`)
}
