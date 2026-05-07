CREATE TABLE `media_blob` (
	`content_sha256` text PRIMARY KEY NOT NULL,
	`mime` text NOT NULL,
	`bytes_size` integer NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `media_gc_queue` (
	`blob_sha256` text PRIMARY KEY NOT NULL,
	`queued_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `media_item` (
	`id` text PRIMARY KEY NOT NULL,
	`source_sha256` text NOT NULL,
	`source_mime` text NOT NULL,
	`source_bytes` integer NOT NULL,
	`source_width` integer NOT NULL,
	`source_height` integer NOT NULL,
	`display_sha256` text NOT NULL,
	`hq_sha256` text,
	`thumbhash` blob NOT NULL,
	`alt_text` text,
	`captured_at` integer,
	`camera_make` text,
	`camera_model` text,
	`lens_model` text,
	`iso` integer,
	`aperture` real,
	`shutter` text,
	`focal_length` real,
	`gps_lat` real,
	`gps_lng` real,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`display_sha256`) REFERENCES `media_blob`(`content_sha256`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`hq_sha256`) REFERENCES `media_blob`(`content_sha256`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `media_item_source_idx` ON `media_item` (`source_sha256`);--> statement-breakpoint
CREATE TABLE `media_ref` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text NOT NULL,
	`is_public` integer NOT NULL,
	`context` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES `media_item`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `media_ref_item_idx` ON `media_ref` (`item_id`);--> statement-breakpoint
CREATE INDEX `media_ref_context_idx` ON `media_ref` (`context`);