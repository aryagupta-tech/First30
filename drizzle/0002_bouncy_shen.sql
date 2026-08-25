CREATE TABLE `custody_events` (
	`id` text PRIMARY KEY NOT NULL,
	`case_id` text NOT NULL,
	`evidence_id` text,
	`action` text NOT NULL,
	`detail` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_custody_events_case_created` ON `custody_events` (`case_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `evidence_analysis` (
	`evidence_id` text PRIMARY KEY NOT NULL,
	`client_sha256` text NOT NULL,
	`ocr_method` text NOT NULL,
	`analysis_status` text DEFAULT 'pending' NOT NULL,
	`analysed_at` integer,
	FOREIGN KEY (`evidence_id`) REFERENCES `evidence`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `evidence_observations` (
	`id` text PRIMARY KEY NOT NULL,
	`case_id` text NOT NULL,
	`evidence_id` text NOT NULL,
	`field` text NOT NULL,
	`value` text NOT NULL,
	`normalized_value` text NOT NULL,
	`source_text` text NOT NULL,
	`confidence` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`evidence_id`) REFERENCES `evidence`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_evidence_observations_case_field` ON `evidence_observations` (`case_id`,`field`);--> statement-breakpoint
CREATE INDEX `idx_evidence_observations_evidence` ON `evidence_observations` (`evidence_id`);--> statement-breakpoint
CREATE TABLE `fact_resolutions` (
	`id` text PRIMARY KEY NOT NULL,
	`case_id` text NOT NULL,
	`field` text NOT NULL,
	`value` text NOT NULL,
	`normalized_value` text NOT NULL,
	`resolution_type` text NOT NULL,
	`source_evidence_id` text,
	`confirmed_at` integer NOT NULL,
	FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_fact_resolutions_case_field` ON `fact_resolutions` (`case_id`,`field`);--> statement-breakpoint
CREATE TABLE `passport_findings` (
	`id` text PRIMARY KEY NOT NULL,
	`case_id` text NOT NULL,
	`rule_code` text NOT NULL,
	`status` text NOT NULL,
	`title_en` text NOT NULL,
	`title_hi` text NOT NULL,
	`detail_en` text NOT NULL,
	`detail_hi` text NOT NULL,
	`evidence_ids_json` text DEFAULT '[]' NOT NULL,
	`acknowledgement_note` text,
	`acknowledged_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_passport_findings_case_rule` ON `passport_findings` (`case_id`,`rule_code`);