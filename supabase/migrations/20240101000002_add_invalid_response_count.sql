-- Add invalid_response_count to review_requests for tracking consecutive invalid SMS replies.
-- Required by Requirement 4.8: 2 consecutive invalid responses ends the conversation.

ALTER TABLE review_requests
  ADD COLUMN invalid_response_count INTEGER NOT NULL DEFAULT 0;

-- Add a deterministic hash column for phone number lookups.
-- AES-GCM encryption is non-deterministic (random IV), so we need a hash for lookups.
-- The hash uses HMAC-SHA256 with a server-side key for consistent, secure lookups.
ALTER TABLE review_requests
  ADD COLUMN customer_phone_hash TEXT;

CREATE INDEX idx_review_requests_phone_hash_sent
  ON review_requests(customer_phone_hash, sent_at DESC);
