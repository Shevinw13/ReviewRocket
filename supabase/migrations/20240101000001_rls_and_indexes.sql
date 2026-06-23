-- Review Rocket MVP: Row Level Security Policies and Performance Indexes
-- This migration enables RLS on core tables and creates policies ensuring
-- business owners can only access their own data. It also adds indexes
-- for common query patterns.

-- =============================================================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================================================
ALTER TABLE business_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_records ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

-- Business owners can only access their own row
CREATE POLICY "Users can only access own data"
  ON business_owners FOR ALL
  USING (auth_user_id = auth.uid());

-- Users can only access review requests belonging to their business
CREATE POLICY "Users can only access own review requests"
  ON review_requests FOR ALL
  USING (business_id IN (SELECT id FROM business_owners WHERE auth_user_id = auth.uid()));

-- Users can only access feedback records belonging to their business
CREATE POLICY "Users can only access own feedback"
  ON feedback_records FOR ALL
  USING (business_id IN (SELECT id FROM business_owners WHERE auth_user_id = auth.uid()));

-- =============================================================================
-- PERFORMANCE INDEXES
-- =============================================================================

-- Index for fetching review requests by business ordered by sent date (dashboard, history)
CREATE INDEX idx_review_requests_business_sent
  ON review_requests(business_id, sent_at DESC);

-- Index for looking up review requests by phone number and sent date (duplicate check)
CREATE INDEX idx_review_requests_phone_sent
  ON review_requests(customer_phone_encrypted, sent_at DESC);

-- Index for fetching unresolved feedback by business (inbox queries)
CREATE INDEX idx_feedback_records_business_unresolved
  ON feedback_records(business_id, is_resolved, created_at DESC);

-- Index for audit log queries by actor (security/compliance)
CREATE INDEX idx_audit_log_actor
  ON audit_log(actor_id, created_at DESC);

-- Index for SMS queue retry function (picks up pending items due for retry)
CREATE INDEX idx_sms_queue_pending
  ON sms_queue(status, next_retry_at) WHERE status = 'pending';
