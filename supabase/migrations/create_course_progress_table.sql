-- Create course_progress table to store topics and periods data
CREATE TABLE IF NOT EXISTS course_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lecturer_id UUID NOT NULL REFERENCES lecturers(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  term_id UUID NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  topics_planned INTEGER,
  topics_taught INTEGER,
  periods_planned INTEGER,
  periods_taught INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Ensure one record per lecturer per course per term per academic year
  UNIQUE(lecturer_id, course_id, term_id, academic_year_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_course_progress_lecturer ON course_progress(lecturer_id);
CREATE INDEX IF NOT EXISTS idx_course_progress_course ON course_progress(course_id);
CREATE INDEX IF NOT EXISTS idx_course_progress_term ON course_progress(term_id);
CREATE INDEX IF NOT EXISTS idx_course_progress_academic_year ON course_progress(academic_year_id);

-- Enable RLS
ALTER TABLE course_progress ENABLE ROW LEVEL SECURITY;

-- Create policy: Lecturers can only manage their own progress data
CREATE POLICY "Lecturers can view their own course progress"
  ON course_progress FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM lecturers WHERE id = lecturer_id
    )
  );

CREATE POLICY "Lecturers can insert their own course progress"
  ON course_progress FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM lecturers WHERE id = lecturer_id
    )
  );

CREATE POLICY "Lecturers can update their own course progress"
  ON course_progress FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT user_id FROM lecturers WHERE id = lecturer_id
    )
  );

CREATE POLICY "Lecturers can delete their own course progress"
  ON course_progress FOR DELETE
  USING (
    auth.uid() IN (
      SELECT user_id FROM lecturers WHERE id = lecturer_id
    )
  );

-- Admins can view all course progress
CREATE POLICY "Admins can view all course progress"
  ON course_progress FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM users WHERE role = 'admin'
    )
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_course_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_course_progress_updated_at
  BEFORE UPDATE ON course_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_course_progress_updated_at();

