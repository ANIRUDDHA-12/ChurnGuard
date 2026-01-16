-- ============================================
-- ChurnGuard: User Activity Table Schema
-- ============================================
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS user_activity (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    socket_id TEXT NOT NULL,
    action_type TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries on action_type and timestamp
CREATE INDEX IF NOT EXISTS idx_user_activity_action_type ON user_activity(action_type);
CREATE INDEX IF NOT EXISTS idx_user_activity_timestamp ON user_activity(timestamp DESC);

-- Enable Row Level Security (optional but recommended)
ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;

-- Policy to allow inserts from the anon key (for server-side inserts)
CREATE POLICY "Allow anonymous inserts" ON user_activity
    FOR INSERT
    WITH CHECK (true);

-- Policy to allow reads (for querying data)
CREATE POLICY "Allow anonymous reads" ON user_activity
    FOR SELECT
    USING (true);
