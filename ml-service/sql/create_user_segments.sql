-- ============================================
-- ChurnGuard: User Segments Table Schema
-- ============================================
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS user_segments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    total_clicks INTEGER NOT NULL DEFAULT 0,
    avg_session_time FLOAT NOT NULL DEFAULT 0.0,
    support_tickets INTEGER NOT NULL DEFAULT 0,
    days_since_signup INTEGER NOT NULL DEFAULT 0,
    feature_usage_score FLOAT NOT NULL DEFAULT 0.0,
    is_churned BOOLEAN NOT NULL DEFAULT FALSE,
    churn_probability FLOAT DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_user_segments_is_churned ON user_segments(is_churned);
CREATE INDEX IF NOT EXISTS idx_user_segments_user_id ON user_segments(user_id);

-- Enable Row Level Security
ALTER TABLE user_segments ENABLE ROW LEVEL SECURITY;

-- Policy to allow anonymous inserts (for the ML service)
CREATE POLICY "Allow anonymous inserts" ON user_segments
    FOR INSERT
    WITH CHECK (true);

-- Policy to allow anonymous reads
CREATE POLICY "Allow anonymous reads" ON user_segments
    FOR SELECT
    USING (true);

-- Policy to allow anonymous updates (for churn predictions)
CREATE POLICY "Allow anonymous updates" ON user_segments
    FOR UPDATE
    USING (true)
    WITH CHECK (true);
