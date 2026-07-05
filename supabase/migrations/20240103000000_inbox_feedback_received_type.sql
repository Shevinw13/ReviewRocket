-- Add 'feedback_received' as a valid inbox_items type.
-- This allows the twilio-webhook to create inbox notifications when
-- customers reply with written feedback for bad reviews.

ALTER TABLE inbox_items DROP CONSTRAINT IF EXISTS inbox_items_type_check;
ALTER TABLE inbox_items ADD CONSTRAINT inbox_items_type_check
  CHECK (type IN ('opt_out', 'feedback_received', 'system'));
