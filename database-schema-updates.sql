-- Database Schema Updates for Student Promotion and Academic Management
-- Run these queries in order to enhance your existing schema

-- 1. Add promotion tracking fields to class_students table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'class_students' AND column_name = 'is_repeater') THEN
        ALTER TABLE public.class_students ADD COLUMN is_repeater boolean DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'class_students' AND column_name = 'previous_level_id') THEN
        ALTER TABLE public.class_students ADD COLUMN previous_level_id bigint;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'class_students' AND column_name = 'promotion_status') THEN
        ALTER TABLE public.class_students ADD COLUMN promotion_status text CHECK (promotion_status IN ('promoted', 'repeated', 'pending')) DEFAULT 'pending';
    END IF;
END
$$;

-- 2. Add foreign key constraint for previous_level_id
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_previous_level') THEN
        ALTER TABLE public.class_students 
        ADD CONSTRAINT fk_previous_level 
        FOREIGN KEY (previous_level_id) REFERENCES public.levels(id);
    END IF;
END
$$;

-- 3. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_class_students_academic_year_level 
ON public.class_students(academic_year_id, level_id);

CREATE INDEX IF NOT EXISTS idx_class_students_student_promotion 
ON public.class_students(student_id, promotion_status);

CREATE INDEX IF NOT EXISTS idx_marks_student_academic_year 
ON public.marks(student_id, academic_year_id);

CREATE INDEX IF NOT EXISTS idx_academic_years_active_dates 
ON public.academic_years(is_active, start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_terms_active_dates 
ON public.terms(is_active, start_date, end_date);

-- 4. Create a function to automatically update active status based on dates
CREATE OR REPLACE FUNCTION update_active_status()
RETURNS TRIGGER AS $$
BEGIN
  -- For academic_years
  IF TG_TABLE_NAME = 'academic_years' THEN
    NEW.is_active = (NEW.start_date <= CURRENT_DATE AND NEW.end_date >= CURRENT_DATE);
  END IF;
  
  -- For terms
  IF TG_TABLE_NAME = 'terms' THEN
    NEW.is_active = (NEW.start_date <= CURRENT_DATE AND NEW.end_date >= CURRENT_DATE);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create triggers for automatic active status updates (optional - use if you prefer triggers over cron jobs)
DROP TRIGGER IF EXISTS academic_years_active_trigger ON public.academic_years;
CREATE TRIGGER academic_years_active_trigger
  BEFORE INSERT OR UPDATE ON public.academic_years
  FOR EACH ROW EXECUTE FUNCTION update_active_status();

DROP TRIGGER IF EXISTS terms_active_trigger ON public.terms;
CREATE TRIGGER terms_active_trigger
  BEFORE INSERT OR UPDATE ON public.terms
  FOR EACH ROW EXECUTE FUNCTION update_active_status();

-- 6. Create a view for easy access to student promotion data
CREATE OR REPLACE VIEW student_promotion_view AS
SELECT 
  cs.id as enrollment_id,
  cs.student_id,
  s.name as student_name,
  s.matricule,
  cs.level_id as current_level,
  l.name as level_name,
  cs.academic_year_id,
  ay.label as academic_year,
  cs.promoted,
  cs.promotion_status,
  cs.is_repeater,
  cs.previous_level_id,
  pl.name as previous_level_name
FROM public.class_students cs
INNER JOIN public.students s ON cs.student_id = s.id
INNER JOIN public.levels l ON cs.level_id = l.id
INNER JOIN public.academic_years ay ON cs.academic_year_id = ay.id
LEFT JOIN public.levels pl ON cs.previous_level_id = pl.id;

-- 7. Create a function to calculate annual averages (can be used in queries)
CREATE OR REPLACE FUNCTION calculate_student_annual_average(
  p_student_id uuid,
  p_academic_year_id uuid
) 
RETURNS numeric 
LANGUAGE plpgsql
AS $$
DECLARE
  annual_average numeric := 0;
  total_weighted numeric := 0;
  total_coefficient numeric := 0;
  mark_record RECORD;
BEGIN
  FOR mark_record IN
    SELECT 
      m.ca_score,
      m.exam_score,
      c.coefficient
    FROM public.marks m
    INNER JOIN public.courses c ON m.course_id = c.id
    WHERE m.student_id = p_student_id 
      AND m.academic_year_id = p_academic_year_id
  LOOP
    total_weighted := total_weighted + ((mark_record.ca_score + mark_record.exam_score) / 2.0) * mark_record.coefficient;
    total_coefficient := total_coefficient + mark_record.coefficient;
  END LOOP;
  
  IF total_coefficient > 0 THEN
    annual_average := total_weighted / total_coefficient;
  END IF;
  
  RETURN ROUND(annual_average, 2);
END;
$$;

-- 8. Create a comprehensive view for student academic performance
CREATE OR REPLACE VIEW student_academic_performance AS
SELECT 
  cs.student_id,
  s.name as student_name,
  s.matricule,
  cs.level_id,
  l.name as level_name,
  cs.academic_year_id,
  ay.label as academic_year,
  calculate_student_annual_average(cs.student_id, cs.academic_year_id) as annual_average,
  CASE 
    WHEN calculate_student_annual_average(cs.student_id, cs.academic_year_id) >= 12.0 AND cs.level_id <= 2 
    THEN TRUE 
    ELSE FALSE 
  END as eligible_for_promotion,
  cs.is_repeater,
  cs.promotion_status
FROM public.class_students cs
INNER JOIN public.students s ON cs.student_id = s.id
INNER JOIN public.levels l ON cs.level_id = l.id
INNER JOIN public.academic_years ay ON cs.academic_year_id = ay.id;

-- 9. Set up cron job for automatic period activation (requires pg_cron extension)
-- First, enable the extension (run as superuser):
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Then schedule the job (uncomment to use):
/*
DO $$
BEGIN
    -- Check if pg_cron extension exists before scheduling
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        PERFORM cron.schedule(
            'update-active-periods',
            '0 1 * * *', -- Run daily at 1 AM
            $cron$
            -- Activate academic years that should be active
            UPDATE public.academic_years 
            SET is_active = true 
            WHERE start_date <= CURRENT_DATE 
              AND end_date >= CURRENT_DATE 
              AND is_active = false;
              
            -- Deactivate expired academic years
            UPDATE public.academic_years 
            SET is_active = false 
            WHERE end_date < CURRENT_DATE 
              AND is_active = true;
              
            -- Activate terms that should be active
            UPDATE public.terms 
            SET is_active = true 
            WHERE start_date <= CURRENT_DATE 
              AND end_date >= CURRENT_DATE 
              AND is_active = false;
              
            -- Deactivate expired terms
            UPDATE public.terms 
            SET is_active = false 
            WHERE end_date < CURRENT_DATE 
              AND is_active = true;
            $cron$
        );
    END IF;
END
$$;
*/

-- 10. Create a function to get promotion statistics
CREATE OR REPLACE FUNCTION get_promotion_statistics(p_academic_year_id uuid)
RETURNS TABLE(
  total_students bigint,
  eligible_for_promotion bigint,
  repeaters bigint,
  promotion_rate numeric
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::bigint as total_students,
    COUNT(CASE WHEN calculate_student_annual_average(cs.student_id, cs.academic_year_id) >= 12.0 AND cs.level_id <= 2 THEN 1 END)::bigint as eligible_for_promotion,
    COUNT(CASE WHEN cs.is_repeater = true THEN 1 END)::bigint as repeaters,
    ROUND(
      (COUNT(CASE WHEN calculate_student_annual_average(cs.student_id, cs.academic_year_id) >= 12.0 AND cs.level_id <= 2 THEN 1 END)::numeric / 
       NULLIF(COUNT(*)::numeric, 0)) * 100, 2
    ) as promotion_rate
  FROM public.class_students cs
  WHERE cs.academic_year_id = p_academic_year_id;
END;
$$;

-- 11. Sample queries to test the new functionality

-- Get all students eligible for promotion in a specific academic year
-- SELECT * FROM student_academic_performance 
-- WHERE academic_year_id = 'your-academic-year-id' 
--   AND eligible_for_promotion = true;

-- Get promotion statistics for an academic year
-- SELECT * FROM get_promotion_statistics('your-academic-year-id');

-- Find all repeaters in the current academic year
-- SELECT * FROM student_promotion_view 
-- WHERE is_repeater = true 
--   AND academic_year_id = (SELECT id FROM academic_years WHERE is_active = true LIMIT 1);

-- Calculate annual average for a specific student
-- SELECT calculate_student_annual_average('student-id', 'academic-year-id');
