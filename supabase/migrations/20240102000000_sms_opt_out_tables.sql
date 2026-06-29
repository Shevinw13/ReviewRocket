-- SMS Opt-Out Handling: New tables for opt-out tracking, inbox notifications, and activity feed
-- This migration creates tables required for SMS opt-out compliance handling.

-- =============================================================================
-- SMS OPT-OUTS TABLE
-- Stores opt-out records linking a hashed phone number to a business.
-- customer_phone_hash is a deterministic hash of the normalized phone number.
-- customer_name_encrypted is AES-256-GCM encrypted at the application level.
-- =============================================================================
CREATE TABLE sms_opt_outs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_owners(id) ON DELETE CASCADE,
  customer_phone_hash TEXT NOT NULL,
  customer_name_encrypted TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  opted_out_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  opted_in_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(business_id, customer_phone_hash)
);

-- Partial index for fast lookups of active opt-outs by phone hash and business
CREATE INDEX idx_sms_opt_outs_lookup
  ON sms_opt_outs(customer_phone_hash, business_id)
  WHERE is_active = true;

-- =============================================================================
-- INBOX ITEMS TABLE
-- Generic inbox table for notifications displayed to the business owner.
-- Supports opt-out notifications and future system notification types.
-- =============================================================================
CREATE TABLE inbox_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_owners(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('opt_out', 'system')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  is_dismissed BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Partial index for fetching active (non-dismissed) inbox items per business
CREATE INDEX idx_inbox_items_active
  ON inbox_items(business_id, created_at DESC)
  WHERE is_dismissed = false;

-- =============================================================================
-- ACTIVITY FEED TABLE
-- Polymorphic activity feed supporting ratings and SMS opt-out/opt-in events.
-- =============================================================================
CREATE TABLE activity_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_owners(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('rating', 'sms_opt_out', 'sms_opt_in')),
  customer_name TEXT,
  customer_phone_formatted TEXT,
  description TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fetching activity feed entries per business in reverse chronological order
CREATE INDEX idx_activity_feed_business
  ON activity_feed(business_id, created_at DESC);
