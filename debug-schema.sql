-- Check for records with NULL promotion_status (which would violate the CHECK constraint)
SELECT COUNT(*) as null_promotion_status_count
FROM public.class_students 
WHERE promotion_status IS NULL;

-- Check for records with invalid promotion_status values
SELECT promotion_status, COUNT(*) as count
FROM public.class_students 
GROUP BY promotion_status;

-- Update any NULL promotion_status to 'pending' (the default)
UPDATE public.class_students 
SET promotion_status = 'pending' 
WHERE promotion_status IS NULL;

-- Update any NULL is_repeater to false (the default)
UPDATE public.class_students 
SET is_repeater = false 
WHERE is_repeater IS NULL;

-- Check the structure of class_students table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'class_students' 
  AND column_name IN ('is_repeater', 'promotion_status', 'previous_level_id')
ORDER BY column_name;
