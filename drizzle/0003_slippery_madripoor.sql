CREATE TABLE `case_intake` (
	`case_id` text PRIMARY KEY NOT NULL,
	`loss_timing` text DEFAULT 'under_30_minutes' NOT NULL,
	`helpline_contacted` integer DEFAULT false NOT NULL,
	`bank_contacted` integer DEFAULT false NOT NULL,
	`delay_reason` text DEFAULT '' NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `complainant_profiles` (
	`case_id` text PRIMARY KEY NOT NULL,
	`full_name` text NOT NULL,
	`mobile` text NOT NULL,
	`gender` text NOT NULL,
	`date_of_birth` text NOT NULL,
	`relation_name` text NOT NULL,
	`address` text NOT NULL,
	`state` text NOT NULL,
	`district` text NOT NULL,
	`police_station` text NOT NULL,
	`pincode` text NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `complaint_submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`case_id` text NOT NULL,
	`acknowledgement` text NOT NULL,
	`status` text DEFAULT 'action_required' NOT NULL,
	`payload_json` text NOT NULL,
	`submitted_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_complaint_submissions_case` ON `complaint_submissions` (`case_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_complaint_submissions_ack` ON `complaint_submissions` (`acknowledgement`);--> statement-breakpoint
CREATE TABLE `information_request_responses` (
	`id` text PRIMARY KEY NOT NULL,
	`request_id` text NOT NULL,
	`case_id` text NOT NULL,
	`evidence_id` text NOT NULL,
	`note` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`request_id`) REFERENCES `information_requests`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`evidence_id`) REFERENCES `evidence`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_request_responses_request` ON `information_request_responses` (`request_id`);--> statement-breakpoint
CREATE INDEX `idx_request_responses_case` ON `information_request_responses` (`case_id`);