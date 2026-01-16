-- ============================================
-- ChurnGuard: Interventions Table Schema
-- ============================================
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS interventions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    action_type TEXT NOT NULL CHECK (action_type IN ('nudge', 'support', 'offer')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ DEFAULT NULL
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_interventions_user_id ON interventions(user_id);
CREATE INDEX IF NOT EXISTS idx_interventions_action_type ON interventions(action_type);
CREATE INDEX IF NOT EXISTS idx_interventions_status ON interventions(status);
CREATE INDEX IF NOT EXISTS idx_interventions_created_at ON interventions(created_at DESC);

-- Enable Row Level Security
ALTER TABLE interventions ENABLE ROW LEVEL SECURITY;

-- Policy for anonymous inserts
CREATE POLICY "Allow anonymous inserts" ON interventions
    FOR INSERT WITH CHECK (true);

-- Policy for anonymous reads
CREATE POLICY "Allow anonymous reads" ON interventions
    FOR SELECT USING (true);

-- Policy for anonymous updates
CREATE POLICY "Allow anonymous updates" ON interventions
    FOR UPDATE USING (true) WITH CHECK (true);
