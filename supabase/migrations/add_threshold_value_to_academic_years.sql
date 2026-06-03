-- Add threshold_value column to academic_years if it doesn't exist
-- This column is used by generate-report-cards and calculate-annual-averages edge functions
-- to determine the promotion threshold dynamically per academic year.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'academic_years' AND column_name = 'threshold_value'
    ) THEN
        ALTER TABLE public.academic_years 
        ADD COLUMN threshold_value numeric NOT NULL DEFAULT 12 
        CHECK (threshold_value >= 5 AND threshold_value <= 15);
    END IF;
END
$$;

-- Update any existing academic years that might have NULL threshold_value
UPDATE public.academic_years 
SET threshold_value = 12 
WHERE threshold_value IS NULL;
