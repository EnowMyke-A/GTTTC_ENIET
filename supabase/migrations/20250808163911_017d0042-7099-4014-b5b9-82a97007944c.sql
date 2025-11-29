-- =============================================
-- GTTTC ENIET Kumba - Backend Schema & RLS Setup
-- Applies schema fixes, triggers, JWT role injection,
-- and comprehensive RLS to resolve write violations
-- =============================================

-- 1) Ensure required columns/constraints exist
-- Terms: add is_active and label check
ALTER TABLE public.terms
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT false;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'terms_label_check'
  ) THEN
    ALTER TABLE public.terms
      ADD CONSTRAINT terms_label_check CHECK (label IN ('First','Second','Third'));
  END IF;
END $$;

-- Profiles: ensure role is restricted to allowed values
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_role_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin','lecturer'));
  END IF;
END $$;

-- Lecturers: unique email + gender check
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lecturers_email_unique'
  ) THEN
    ALTER TABLE public.lecturers
      ADD CONSTRAINT lecturers_email_unique UNIQUE (email);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lecturers_gender_check'
  ) THEN
    ALTER TABLE public.lecturers
      ADD CONSTRAINT lecturers_gender_check CHECK (trim(gender) IN ('Male', 'Female') AND 
    gender = initcap(trim(gender)));
  END IF;
END $$;

-- Students: gender check
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'students_gender_check'
  ) THEN
    ALTER TABLE public.students
      ADD CONSTRAINT students_gender_check CHECK (trim(gender) IN ('Male', 'Female') AND 
    gender = initcap(trim(gender)));
  END IF;
END $$;

-- 2) Ensure foreign keys exist (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'classes_department_fk'
  ) THEN
    ALTER TABLE public.classes
      ADD CONSTRAINT classes_department_fk
      FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'courses_department_fk'
  ) THEN
    ALTER TABLE public.courses
      ADD CONSTRAINT courses_department_fk
      FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'terms_year_fk'
  ) THEN
    ALTER TABLE public.terms
      ADD CONSTRAINT terms_year_fk
      FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'class_students_class_fk'
  ) THEN
    ALTER TABLE public.class_students
      ADD CONSTRAINT class_students_class_fk
      FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'class_students_year_fk'
  ) THEN
    ALTER TABLE public.class_students
      ADD CONSTRAINT class_students_year_fk
      FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'class_students_student_fk'
  ) THEN
    ALTER TABLE public.class_students
      ADD CONSTRAINT class_students_student_fk
      FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lecturers_course_fk'
  ) THEN
    ALTER TABLE public.lecturers
      ADD CONSTRAINT lecturers_course_fk
      FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'marks_student_fk'
  ) THEN
    ALTER TABLE public.marks
      ADD CONSTRAINT marks_student_fk
      FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'marks_course_fk'
  ) THEN
    ALTER TABLE public.marks
      ADD CONSTRAINT marks_course_fk
      FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'marks_term_fk'
  ) THEN
    ALTER TABLE public.marks
      ADD CONSTRAINT marks_term_fk
      FOREIGN KEY (term_id) REFERENCES public.terms(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'marks_lecturer_fk'
  ) THEN
    ALTER TABLE public.marks
      ADD CONSTRAINT marks_lecturer_fk
      FOREIGN KEY (lecturer_id) REFERENCES public.lecturers(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'discipline_student_fk'
  ) THEN
    ALTER TABLE public.discipline_records
      ADD CONSTRAINT discipline_student_fk
      FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'discipline_term_fk'
  ) THEN
    ALTER TABLE public.discipline_records
      ADD CONSTRAINT discipline_term_fk
      FOREIGN KEY (term_id) REFERENCES public.terms(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 3) Marks: align to computed columns and types
ALTER TABLE public.marks
  ALTER COLUMN ca_score TYPE numeric(5,2) USING ca_score::numeric(5,2),
  ALTER COLUMN exam_score TYPE numeric(5,2) USING exam_score::numeric(5,2);

-- Recreate generated columns idempotently
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='marks' AND column_name='total_score'
  ) THEN
    ALTER TABLE public.marks DROP COLUMN total_score;
  END IF;
  ALTER TABLE public.marks
    ADD COLUMN total_score numeric(5,2) GENERATED ALWAYS AS (ca_score + exam_score) STORED;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='marks' AND column_name='grade'
  ) THEN
    ALTER TABLE public.marks DROP COLUMN grade;
  END IF;
  ALTER TABLE public.marks
    ADD COLUMN grade text GENERATED ALWAYS AS (
      CASE
        WHEN (coalesce(ca_score,0) + coalesce(exam_score,0)) < 10 THEN 'F'
        WHEN (coalesce(ca_score,0) + coalesce(exam_score,0)) < 12 THEN 'E'
        WHEN (coalesce(ca_score,0) + coalesce(exam_score,0)) < 14 THEN 'D'
        WHEN (coalesce(ca_score,0) + coalesce(exam_score,0)) < 16 THEN 'C'
        WHEN (coalesce(ca_score,0) + coalesce(exam_score,0)) < 18 THEN 'B'
        ELSE 'A'
      END
    ) STORED;
END $$;

-- 4) Triggers & functions for business rules
-- 4a) Auto-create 3 terms on new academic year
CREATE OR REPLACE FUNCTION public.create_terms_for_year()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.terms (label, academic_year_id, is_active, start_date, end_date)
  VALUES
    ('First', NEW.id, true, NEW.start_date, NEW.start_date + interval '3 months'),
    ('Second', NEW.id, false, NEW.start_date + interval '3 months', NEW.start_date + interval '6 months'),
    ('Third', NEW.id, false, NEW.start_date + interval '6 months', NEW.end_date);
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname='trg_create_terms'
  ) THEN
    DROP TRIGGER trg_create_terms ON public.academic_years;
  END IF;
  CREATE TRIGGER trg_create_terms
  AFTER INSERT ON public.academic_years
  FOR EACH ROW EXECUTE FUNCTION public.create_terms_for_year();
END $$;

-- 4b) Ensure only one active academic year at a time (wire existing function)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname='trg_single_active_year'
  ) THEN
    DROP TRIGGER trg_single_active_year ON public.academic_years;
  END IF;
  CREATE TRIGGER trg_single_active_year
  BEFORE INSERT OR UPDATE ON public.academic_years
  FOR EACH ROW EXECUTE FUNCTION public.validate_active_academic_year();
END $$;

-- 4c) Ensure only one active term per academic year
CREATE OR REPLACE FUNCTION public.ensure_single_active_term()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.is_active = TRUE THEN
    UPDATE public.terms
      SET is_active = FALSE
      WHERE academic_year_id = NEW.academic_year_id AND id <> NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname='trg_single_active_term'
  ) THEN
    DROP TRIGGER trg_single_active_term ON public.terms;
  END IF;
  CREATE TRIGGER trg_single_active_term
  BEFORE INSERT OR UPDATE ON public.terms
  FOR EACH ROW EXECUTE FUNCTION public.ensure_single_active_term();
END $$;

-- 4d) Prevent deactivating all terms while the year is active
CREATE OR REPLACE FUNCTION public.prevent_all_terms_inactive()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  active_terms_count int;
  _year_active boolean;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.is_active = TRUE AND NEW.is_active = FALSE THEN
    SELECT COUNT(*) INTO active_terms_count FROM public.terms
      WHERE academic_year_id = OLD.academic_year_id AND id <> OLD.id AND is_active = TRUE;

    SELECT is_active INTO _year_active FROM public.academic_years WHERE id = OLD.academic_year_id;

    IF _year_active = TRUE AND COALESCE(active_terms_count,0) = 0 THEN
      RAISE EXCEPTION 'At least one term must remain active while the academic year is active';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname='trg_prevent_all_terms_inactive'
  ) THEN
    DROP TRIGGER trg_prevent_all_terms_inactive ON public.terms;
  END IF;
  CREATE TRIGGER trg_prevent_all_terms_inactive
  BEFORE UPDATE ON public.terms
  FOR EACH ROW EXECUTE FUNCTION public.prevent_all_terms_inactive();
END $$;

-- 5) JWT role injection via profiles
CREATE OR REPLACE FUNCTION public.jwt_custom_claims()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT jsonb_build_object('role', p.role)
  FROM public.profiles p
  WHERE p.id = auth.uid()
  LIMIT 1;
$$;

-- Configure Supabase to use the custom claims function
SELECT auth.set_jwt_custom_claims('public.jwt_custom_claims');

-- 6) Keep profiles in sync with auth.users (on signup)
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'user_role', 'lecturer')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname='on_auth_user_created'
  ) THEN
    DROP TRIGGER on_auth_user_created ON auth.users;
  END IF;
  CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();
END $$;

-- Backfill profiles for existing users
INSERT INTO public.profiles (id, full_name, role)
SELECT u.id,
       COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email,'@',1)) AS full_name,
       COALESCE(u.raw_user_meta_data->>'user_role','lecturer') AS role
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- 7) RLS Policies
-- Enable RLS across core tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discipline_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lecturers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marks ENABLE ROW LEVEL SECURITY;

-- Drop conflicting existing policies on lecturers/marks (if present)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='lecturers' AND policyname='Admins can manage all lecturers') THEN
    DROP POLICY "Admins can manage all lecturers" ON public.lecturers;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='lecturers' AND policyname='Admins manage all lecturers') THEN
    DROP POLICY "Admins manage all lecturers" ON public.lecturers;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='lecturers' AND policyname='Lecturers view their own lecturer row') THEN
    DROP POLICY "Lecturers view their own lecturer row" ON public.lecturers;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='lecturers' AND policyname='Lecturers can view their own profile') THEN
    DROP POLICY "Lecturers can view their own profile" ON public.lecturers;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='marks' AND policyname='Lecturers can manage marks for their course only') THEN
    DROP POLICY "Lecturers can manage marks for their course only" ON public.marks;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='marks' AND policyname='Admins manage all marks') THEN
    DROP POLICY "Admins manage all marks" ON public.marks;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='marks' AND policyname='Lecturers manage only their course marks') THEN
    DROP POLICY "Lecturers manage only their course marks" ON public.marks;
  END IF;
END $$;

-- Profiles: user can view own, admin full access
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='Users can view own profile'
  ) THEN
    CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT TO authenticated
    USING (auth.uid() = id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='Admins full access profiles'
  ) THEN
    CREATE POLICY "Admins full access profiles"
    ON public.profiles FOR ALL TO authenticated
    USING (auth.jwt()->>'role' = 'admin')
    WITH CHECK (auth.jwt()->>'role' = 'admin');
  END IF;
END $$;

-- Generic: Admin full access + all authenticated can read
DO $$ BEGIN
  PERFORM 1;
  -- departments
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='departments' AND policyname='Admins full access departments') THEN
    CREATE POLICY "Admins full access departments" ON public.departments FOR ALL TO authenticated
    USING (auth.jwt()->>'role' = 'admin') WITH CHECK (auth.jwt()->>'role' = 'admin');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='departments' AND policyname='Authenticated can read departments') THEN
    CREATE POLICY "Authenticated can read departments" ON public.departments FOR SELECT TO authenticated USING (true);
  END IF;

  -- courses
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='courses' AND policyname='Admins full access courses') THEN
    CREATE POLICY "Admins full access courses" ON public.courses FOR ALL TO authenticated
    USING (auth.jwt()->>'role' = 'admin') WITH CHECK (auth.jwt()->>'role' = 'admin');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='courses' AND policyname='Authenticated can read courses') THEN
    CREATE POLICY "Authenticated can read courses" ON public.courses FOR SELECT TO authenticated USING (true);
  END IF;

  -- classes
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='classes' AND policyname='Admins full access classes') THEN
    CREATE POLICY "Admins full access classes" ON public.classes FOR ALL TO authenticated
    USING (auth.jwt()->>'role' = 'admin') WITH CHECK (auth.jwt()->>'role' = 'admin');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='classes' AND policyname='Authenticated can read classes') THEN
    CREATE POLICY "Authenticated can read classes" ON public.classes FOR SELECT TO authenticated USING (true);
  END IF;

  -- academic_years
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='academic_years' AND policyname='Admins full access academic years') THEN
    CREATE POLICY "Admins full access academic years" ON public.academic_years FOR ALL TO authenticated
    USING (auth.jwt()->>'role' = 'admin') WITH CHECK (auth.jwt()->>'role' = 'admin');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='academic_years' AND policyname='Authenticated can read academic years') THEN
    CREATE POLICY "Authenticated can read academic years" ON public.academic_years FOR SELECT TO authenticated USING (true);
  END IF;

  -- terms
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='terms' AND policyname='Admins full access terms') THEN
    CREATE POLICY "Admins full access terms" ON public.terms FOR ALL TO authenticated
    USING (auth.jwt()->>'role' = 'admin') WITH CHECK (auth.jwt()->>'role' = 'admin');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='terms' AND policyname='Authenticated can read terms') THEN
    CREATE POLICY "Authenticated can read terms" ON public.terms FOR SELECT TO authenticated USING (true);
  END IF;

  -- students
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='students' AND policyname='Admins full access students') THEN
    CREATE POLICY "Admins full access students" ON public.students FOR ALL TO authenticated
    USING (auth.jwt()->>'role' = 'admin') WITH CHECK (auth.jwt()->>'role' = 'admin');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='students' AND policyname='Authenticated can read students') THEN
    CREATE POLICY "Authenticated can read students" ON public.students FOR SELECT TO authenticated USING (true);
  END IF;

  -- class_students
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='class_students' AND policyname='Admins full access class_students') THEN
    CREATE POLICY "Admins full access class_students" ON public.class_students FOR ALL TO authenticated
    USING (auth.jwt()->>'role' = 'admin') WITH CHECK (auth.jwt()->>'role' = 'admin');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='class_students' AND policyname='Authenticated can read class_students') THEN
    CREATE POLICY "Authenticated can read class_students" ON public.class_students FOR SELECT TO authenticated USING (true);
  END IF;

  -- discipline_records
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='discipline_records' AND policyname='Admins full access discipline_records') THEN
    CREATE POLICY "Admins full access discipline_records" ON public.discipline_records FOR ALL TO authenticated
    USING (auth.jwt()->>'role' = 'admin') WITH CHECK (auth.jwt()->>'role' = 'admin');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='discipline_records' AND policyname='Authenticated can read discipline_records') THEN
    CREATE POLICY "Authenticated can read discipline_records" ON public.discipline_records FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- Lecturers: admins full access + lecturers can view themselves
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='lecturers' AND policyname='Admins full access lecturers') THEN
    CREATE POLICY "Admins full access lecturers" ON public.lecturers FOR ALL TO authenticated
    USING (auth.jwt()->>'role' = 'admin') WITH CHECK (auth.jwt()->>'role' = 'admin');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='lecturers' AND policyname='Lecturers view self') THEN
    CREATE POLICY "Lecturers view self" ON public.lecturers FOR SELECT TO authenticated
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- Marks: admins full access + lecturers restricted to their course and only active term & year
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='marks' AND policyname='Admins full access marks') THEN
    CREATE POLICY "Admins full access marks" ON public.marks FOR ALL TO authenticated
    USING (auth.jwt()->>'role' = 'admin') WITH CHECK (auth.jwt()->>'role' = 'admin');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='marks' AND policyname='Lecturers manage own course marks (active term/year)') THEN
    CREATE POLICY "Lecturers manage own course marks (active term/year)" ON public.marks FOR ALL TO authenticated
    USING (
      auth.jwt()->>'role' = 'lecturer'
      AND EXISTS (
        SELECT 1 FROM public.lecturers l
        WHERE l.user_id = auth.uid() AND l.id = marks.lecturer_id AND l.course_id = marks.course_id
      )
      AND EXISTS (
        SELECT 1 FROM public.terms t
        JOIN public.academic_years y ON y.id = t.academic_year_id
        WHERE t.id = marks.term_id AND t.is_active = TRUE AND y.is_active = TRUE
      )
    )
    WITH CHECK (
      auth.jwt()->>'role' = 'lecturer'
      AND EXISTS (
        SELECT 1 FROM public.lecturers l
        WHERE l.user_id = auth.uid() AND l.id = marks.lecturer_id AND l.course_id = marks.course_id
      )
      AND EXISTS (
        SELECT 1 FROM public.terms t
        JOIN public.academic_years y ON y.id = t.academic_year_id
        WHERE t.id = marks.term_id AND t.is_active = TRUE AND y.is_active = TRUE
      )
    );
  END IF;
END $$;

-- Optional: allow authenticated to read marks (for reporting). Keep strict if not desired.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='marks' AND policyname='Authenticated can read marks') THEN
    CREATE POLICY "Authenticated can read marks" ON public.marks FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- 8) Data hygiene/backfill
-- Backfill terms for academic years missing them
DO $$ BEGIN
  WITH years_without_terms AS (
    SELECT a.id, a.start_date, a.end_date
    FROM public.academic_years a
    WHERE NOT EXISTS (
      SELECT 1 FROM public.terms t WHERE t.academic_year_id = a.id
    )
  )
  INSERT INTO public.terms (label, academic_year_id, is_active, start_date, end_date)
  SELECT 'First', y.id, TRUE, y.start_date, y.start_date + interval '3 months' FROM years_without_terms y
  UNION ALL
  SELECT 'Second', y.id, FALSE, y.start_date + interval '3 months', y.start_date + interval '6 months' FROM years_without_terms y
  UNION ALL
  SELECT 'Third', y.id, FALSE, y.start_date + interval '6 months', y.end_date FROM years_without_terms y;
END $$;

-- Ensure only one academic year remains active (keep the most recent active)
DO $$ BEGIN
  UPDATE public.academic_years ay
  SET is_active = FALSE
  WHERE ay.is_active = TRUE AND ay.id NOT IN (
    SELECT id FROM (
      SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC NULLS LAST) AS rn
      FROM public.academic_years WHERE is_active = TRUE
    ) s WHERE s.rn = 1
  );
END $$;
