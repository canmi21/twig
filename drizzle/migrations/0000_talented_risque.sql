CREATE TABLE `contents` (
	`cid` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_contents_type_status` ON `contents` (`type`,`status`);--> statement-breakpoint
CREATE TABLE `notes` (
	`cid` text PRIMARY KEY NOT NULL,
	`text` text NOT NULL,
	`images` text DEFAULT '[]',
	FOREIGN KEY (`cid`) REFERENCES `contents`(`cid`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `posts` (
	`cid` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`content` text NOT NULL,
	`summary` text,
	`tags` text DEFAULT '[]',
	`cover` text,
	FOREIGN KEY (`cid`) REFERENCES `contents`(`cid`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `posts_slug_unique` ON `posts` (`slug`);