CREATE TABLE `case_events` (
	`id` text PRIMARY KEY NOT NULL,
	`case_id` text NOT NULL,
	`type` text NOT NULL,
	`title_en` text NOT NULL,
	`title_hi` text NOT NULL,
	`detail_en` text NOT NULL,
	`detail_hi` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_events_case_created` ON `case_events` (`case_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `cases` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`locale` text DEFAULT 'en' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`step` integer DEFAULT 1 NOT NULL,
	`fraud_type` text DEFAULT 'fake_kyc' NOT NULL,
	`channel` text DEFAULT 'upi' NOT NULL,
	`amount` integer DEFAULT 18499 NOT NULL,
	`occurred_at` text,
	`reference` text,
	`bank` text,
	`recipient` text,
	`narrative_input` text,
	`complaint_en` text,
	`complaint_hi` text,
	`acknowledgement` text,
	`held_amount` integer DEFAULT 0 NOT NULL,
	`restored_amount` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`submitted_at` integer,
	FOREIGN KEY (`session_id`) REFERENCES `demo_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_cases_session_updated` ON `cases` (`session_id`,`updated_at`);--> statement-breakpoint
CREATE TABLE `demo_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`persona_id` text DEFAULT 'sunita' NOT NULL,
	`locale` text DEFAULT 'en' NOT NULL,
	`ai_calls` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `evidence` (
	`id` text PRIMARY KEY NOT NULL,
	`case_id` text NOT NULL,
	`kind` text NOT NULL,
	`object_key` text,
	`filename` text NOT NULL,
	`mime_type` text NOT NULL,
	`size` integer DEFAULT 0 NOT NULL,
	`is_sample` integer DEFAULT false NOT NULL,
	`extracted_json` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_evidence_case` ON `evidence` (`case_id`);--> statement-breakpoint
CREATE TABLE `information_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`case_id` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`prompt_en` text NOT NULL,
	`prompt_hi` text NOT NULL,
	`evidence_id` text,
	`created_at` integer NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_requests_case` ON `information_requests` (`case_id`);--> statement-breakpoint
CREATE TABLE `restorations` (
	`id` text PRIMARY KEY NOT NULL,
	`case_id` text NOT NULL,
	`amount` integer NOT NULL,
	`status` text DEFAULT 'available' NOT NULL,
	`confirmed_at` integer,
	`completed_at` integer,
	FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_restorations_case` ON `restorations` (`case_id`);--> statement-breakpoint
CREATE TABLE `suspects` (
	`id` text PRIMARY KEY NOT NULL,
	`case_id` text NOT NULL,
	`type` text NOT NULL,
	`value` text NOT NULL,
	FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_suspects_case` ON `suspects` (`case_id`);--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`case_id` text NOT NULL,
	`amount` integer NOT NULL,
	`reference` text NOT NULL,
	`bank` text,
	`recipient` text,
	`occurred_at` text,
	FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_transactions_case` ON `transactions` (`case_id`);