CREATE TABLE `contents` (
	`cid` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`published` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `media` (
	`hash` text PRIMARY KEY NOT NULL,
	`ext` text NOT NULL,
	`mime` text NOT NULL,
	`size` integer NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `media_refs` (
	`hash` text NOT NULL,
	`cid` text NOT NULL,
	PRIMARY KEY(`hash`, `cid`),
	FOREIGN KEY (`hash`) REFERENCES `media`(`hash`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`cid`) REFERENCES `contents`(`cid`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `posts` (
	`cid` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`category` text,
	`tags` text,
	`content` text NOT NULL,
	FOREIGN KEY (`cid`) REFERENCES `contents`(`cid`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `posts_slug_unique` ON `posts` (`slug`);
