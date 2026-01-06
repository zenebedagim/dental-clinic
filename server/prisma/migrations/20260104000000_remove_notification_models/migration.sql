-- DropNotificationModels
-- This migration removes all notification-related tables, enums, and columns

-- Drop foreign key constraints first
ALTER TABLE "NotificationLog" DROP CONSTRAINT IF EXISTS "NotificationLog_notificationId_fkey";
ALTER TABLE "NotificationPreference" DROP CONSTRAINT IF EXISTS "NotificationPreference_userId_fkey";
ALTER TABLE "Notification" DROP CONSTRAINT IF EXISTS "Notification_userId_fkey";

-- Drop indexes
DROP INDEX IF EXISTS "Notification_userId_idx";
DROP INDEX IF EXISTS "Notification_type_idx";
DROP INDEX IF EXISTS "Notification_priority_idx";
DROP INDEX IF EXISTS "Notification_read_idx";
DROP INDEX IF EXISTS "Notification_delivered_idx";
DROP INDEX IF EXISTS "Notification_createdAt_idx";
DROP INDEX IF EXISTS "Notification_eventId_idx";
DROP INDEX IF EXISTS "NotificationPreference_userId_idx";
DROP INDEX IF EXISTS "NotificationPreference_notificationType_idx";
DROP INDEX IF EXISTS "NotificationLog_notificationId_idx";
DROP INDEX IF EXISTS "NotificationLog_event_idx";
DROP INDEX IF EXISTS "NotificationLog_timestamp_idx";
DROP INDEX IF EXISTS "Treatment_sentToReception_idx";

-- Drop tables
DROP TABLE IF EXISTS "NotificationLog";
DROP TABLE IF EXISTS "NotificationPreference";
DROP TABLE IF EXISTS "Notification";

-- Drop columns from Treatment table
ALTER TABLE "Treatment" DROP COLUMN IF EXISTS "sentToReception";
ALTER TABLE "Treatment" DROP COLUMN IF EXISTS "sentToReceptionAt";

-- Drop enums (PostgreSQL doesn't support DROP TYPE IF EXISTS in older versions, so we use a different approach)
DO $$ BEGIN
    DROP TYPE IF EXISTS "NotificationLogEvent";
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

DO $$ BEGIN
    DROP TYPE IF EXISTS "NotificationType";
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

DO $$ BEGIN
    DROP TYPE IF EXISTS "NotificationPriority";
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

