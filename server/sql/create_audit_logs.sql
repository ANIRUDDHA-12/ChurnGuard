-- Audit Logs Table
-- ==================
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    action TEXT NOT NULL,
    actor TEXT NOT NULL DEFAULT 'system',
    details JSONB DEFAULT '{}',
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Add role-based access columns to user_segments
-- ALTER TABLE user_segments ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'viewer';

-- Example roles: 'admin', 'viewer', 'operator'
COMMENT ON TABLE audit_logs IS 'Tracks all system actions for compliance and debugging';
