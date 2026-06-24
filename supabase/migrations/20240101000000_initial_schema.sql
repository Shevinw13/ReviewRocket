-- Nudg MVP: Initial Database Schema
-- This migration creates all core tables for the Nudg application.
-- Sensitive fields (customer phone, customer name, feedback text) are encrypted
-- at the application level using AES-256-GCM before storage.

-- =============================================================================
-- BUSINESS OWNERS TABLE
-- Stores registered business owner profiles linked to Supabase Auth users.
-- =============================================================================
CREATE TABLE business_owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  business_name TEXT NOT NULL,
  email TEXT NOT NULL,
  google_review_url TEXT NOT NULL,
  subscription_tier TEXT NOT NULL DEFAULT 'starter' CHECK (subscription_tier IN ('starter', 'growth', 'pro')),
  sms_used_this_period INTEGER NOT NULL DEFAULT 0,
  billing_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- REVIEW REQUESTS TABLE
-- Tracks SMS feedback requests sent to customers.
-- customer_phone_encrypted and customer_name_encrypted are AES-256-GCM encrypted
-- at the application level before storage.
-- =============================================================================
CREATE TABLE review_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_owners(id) ON DELETE CASCADE,
  customer_phone_encrypted TEXT NOT NULL,
  customer_name_encrypted TEXT,
  service_type TEXT,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'rating_received', 'feedback_received', 'failed', 'expired')),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  feedback_received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- FEEDBACK RECORDS TABLE
-- Stores customer feedback with ratings and optional encrypted feedback text.
-- feedback_text_encrypted is AES-256-GCM encrypted at the application level.
-- =============================================================================
CREATE TABLE feedback_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_request_id UUID NOT NULL REFERENCES review_requests(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES business_owners(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback_text_encrypted TEXT,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- AUDIT LOG TABLE
-- Immutable log of security-relevant events for compliance and debugging.
-- =============================================================================
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('login', 'sms_sent', 'feedback_received', 'feedback_resolved', 'record_deleted')),
  resource_id TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- DEVICE TOKENS TABLE
-- Stores push notification device tokens for each business owner's devices.
-- =============================================================================
CREATE TABLE device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_owners(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'ios',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- SMS QUEUE TABLE
-- Queue for SMS messages that failed to send and need retry.
-- Retries every 5 minutes for up to 24 hours before marking as failed.
-- =============================================================================
CREATE TABLE sms_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_request_id UUID NOT NULL REFERENCES review_requests(id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  retry_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  next_retry_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
