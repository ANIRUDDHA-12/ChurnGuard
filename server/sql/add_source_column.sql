-- ============================================
-- ChurnGuard: Add Source Column to Interventions
-- ============================================
-- Run this in Supabase Dashboard > SQL Editor
-- This adds the source column to track manual vs sentinel interventions
-- ============================================

-- Add source column if it doesn't exist
ALTER TABLE interventions 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';

-- Add check constraint for valid sources
ALTER TABLE interventions 
DROP CONSTRAINT IF EXISTS interventions_source_check;

ALTER TABLE interventions 
ADD CONSTRAINT interventions_source_check 
CHECK (source IN ('manual', 'sentinel', 'api'));

-- Create index for faster filtering by source
CREATE INDEX IF NOT EXISTS idx_interventions_source 
ON interventions(source);

-- Update existing rows without source to 'manual'
UPDATE interventions 
SET source = 'manual' 
WHERE source IS NULL;
