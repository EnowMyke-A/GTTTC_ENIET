-- Update database schema to fix build errors

-- Add missing columns to existing tables
ALTER TABLE students ADD COLUMN IF NOT EXISTS matricule TEXT UNIQUE;
ALTER TABLE terms ADD COLUMN IF NOT EXISTS academic_year_id UUID REFERENCES academic_years(id);
ALTER TABLE courses ADD COLUMN IF NOT EXISTS code TEXT;

-- Create classes table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  department_id UUID REFERENCES departments(id) NOT NULL,
  academic_year_id UUID REFERENCES academic_years(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on classes table
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- Create policies for classes table
CREATE POLICY "Everyone can view classes" 
ON public.classes 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage classes" 
ON public.classes 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_students_matricule ON students(matricule);
CREATE INDEX IF NOT EXISTS idx_terms_academic_year ON terms(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_courses_code ON courses(code);
CREATE INDEX IF NOT EXISTS idx_classes_department ON classes(department_id);
CREATE INDEX IF NOT EXISTS idx_classes_academic_year ON classes(academic_year_id);