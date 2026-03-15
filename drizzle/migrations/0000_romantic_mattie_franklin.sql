CREATE TABLE `base_content` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`title` text,
	`content` text NOT NULL,
	`summary` text,
	`tags` text DEFAULT '[]' NOT NULL,
	`cover_image` text,
	`slug` text,
	`is_draft` integer DEFAULT 0 NOT NULL,
	`is_pinned` integer DEFAULT 0 NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`published_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `base_content_slug_unique` ON `base_content` (`slug`);--> statement-breakpoint
CREATE TABLE `guestbook_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`nickname` text NOT NULL,
	`avatar` text,
	`content` text NOT NULL,
	`website` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `links` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`url` text NOT NULL,
	`avatar` text,
	`description` text,
	`category` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `media_extension` (
	`id` text PRIMARY KEY NOT NULL,
	`content_id` text NOT NULL,
	`media_type` text NOT NULL,
	`rating` integer,
	`creator` text,
	`cover` text,
	`year` integer,
	`comment` text,
	`finished_at` text,
	FOREIGN KEY (`content_id`) REFERENCES `base_content`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `project_extension` (
	`id` text PRIMARY KEY NOT NULL,
	`content_id` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`demo_url` text,
	`repo_url` text,
	`tech_stack` text DEFAULT '[]' NOT NULL,
	`screenshots` text DEFAULT '[]' NOT NULL,
	`role` text,
	FOREIGN KEY (`content_id`) REFERENCES `base_content`(`id`) ON UPDATE no action ON DELETE no action
);
