CREATE TABLE `case_exports` (
	`id` text PRIMARY KEY NOT NULL,
	`case_id` text NOT NULL,
	`version` integer NOT NULL,
	`verification_code` text NOT NULL,
	`content_fingerprint` text NOT NULL,
	`manifest_hash` text NOT NULL,
	`signature` text NOT NULL,
	`manifest_json` text NOT NULL,
	`file_count` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_case_exports_verification_code` ON `case_exports` (`verification_code`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_case_exports_case_fingerprint` ON `case_exports` (`case_id`,`content_fingerprint`);--> statement-breakpoint
CREATE INDEX `idx_case_exports_case_version` ON `case_exports` (`case_id`,`version`);--> statement-breakpoint
CREATE TABLE `evidence_integrity` (
	`evidence_id` text PRIMARY KEY NOT NULL,
	`sha256` text NOT NULL,
	`ocr_text` text,
	`extraction_json` text,
	`confirmed_at` integer,
	FOREIGN KEY (`evidence_id`) REFERENCES `evidence`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_evidence_integrity_sha` ON `evidence_integrity` (`sha256`,`evidence_id`);--> statement-breakpoint
CREATE TABLE `incident_events` (
	`id` text PRIMARY KEY NOT NULL,
	`case_id` text NOT NULL,
	`occurred_at` text NOT NULL,
	`event_type` text NOT NULL,
	`description_en` text NOT NULL,
	`description_hi` text DEFAULT '' NOT NULL,
	`source` text DEFAULT 'citizen' NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_incident_events_case_position` ON `incident_events` (`case_id`,`position`);--> statement-breakpoint
CREATE TABLE `milestones` (
	`id` text PRIMARY KEY NOT NULL,
	`case_id` text NOT NULL,
	`kind` text NOT NULL,
	`reference` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`occurred_at` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_milestones_case_created` ON `milestones` (`case_id`,`created_at`);