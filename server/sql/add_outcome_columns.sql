-- ============================================
-- ChurnGuard: Add Outcome Tracking Columns
-- ============================================
-- Run this in Supabase Dashboard > SQL Editor
-- Adds columns for tracking intervention effectiveness
-- ============================================

-- Add outcome column (success, failure, pending)
ALTER TABLE interventions 
ADD COLUMN IF NOT EXISTS outcome TEXT DEFAULT 'pending';

-- Add constraint for valid outcomes
ALTER TABLE interventions 
DROP CONSTRAINT IF EXISTS interventions_outcome_check;

ALTER TABLE interventions 
ADD CONSTRAINT interventions_outcome_check 
CHECK (outcome IN ('success', 'failure', 'pending'));

-- Add risk_delta column (new_risk - old_risk)
ALTER TABLE interventions 
ADD COLUMN IF NOT EXISTS risk_delta FLOAT DEFAULT NULL;

-- Add risk_at_intervention (snapshot of risk when action was taken)
ALTER TABLE interventions 
ADD COLUMN IF NOT EXISTS risk_at_intervention FLOAT DEFAULT NULL;

-- Add current_risk (latest risk after attribution)
ALTER TABLE interventions 
ADD COLUMN IF NOT EXISTS current_risk FLOAT DEFAULT NULL;

-- Add attribution_date (when outcome was determined)
ALTER TABLE interventions 
ADD COLUMN IF NOT EXISTS attributed_at TIMESTAMPTZ DEFAULT NULL;

-- Create indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_interventions_outcome 
ON interventions(outcome);

CREATE INDEX IF NOT EXISTS idx_interventions_attributed_at 
ON interventions(attributed_at);

-- Update existing rows to pending if null
UPDATE interventions 
SET outcome = 'pending' 
WHERE outcome IS NULL;
