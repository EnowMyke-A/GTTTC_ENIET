-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.academic_years (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  label text NOT NULL UNIQUE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_active boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT academic_years_pkey PRIMARY KEY (id)
);
CREATE TABLE public.class_students (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  academic_year_id uuid,
  student_id uuid,
  promoted boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  level_id bigint,
  is_repeater boolean DEFAULT false,
  previous_level_id bigint,
  promotion_status text DEFAULT 'pending'::text CHECK (promotion_status = ANY (ARRAY['promoted'::text, 'repeated'::text, 'pending'::text])),
  CONSTRAINT class_students_pkey PRIMARY KEY (id),
  CONSTRAINT class_students_academic_year_id_fkey FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id),
  CONSTRAINT class_students_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id),
  CONSTRAINT class_students_level_id_fkey FOREIGN KEY (level_id) REFERENCES public.levels(id),
  CONSTRAINT fk_previous_level FOREIGN KEY (previous_level_id) REFERENCES public.levels(id)
);
CREATE TABLE public.classes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  department_id uuid NOT NULL,
  academic_year_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT classes_pkey PRIMARY KEY (id),
  CONSTRAINT classes_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id),
  CONSTRAINT classes_academic_year_id_fkey FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id)
);
CREATE TABLE public.course_departments (
  course_id uuid NOT NULL,
  department_id uuid NOT NULL,
  CONSTRAINT course_departments_pkey PRIMARY KEY (course_id, department_id),
  CONSTRAINT course_departments_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id),
  CONSTRAINT course_departments_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id)
);
CREATE TABLE public.courses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  department_id uuid,
  coefficient integer NOT NULL CHECK (coefficient > 0),
  created_at timestamp with time zone DEFAULT now(),
  level_id bigint NOT NULL,
  code text,
  CONSTRAINT courses_pkey PRIMARY KEY (id),
  CONSTRAINT courses_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id),
  CONSTRAINT fk_courses_level_id FOREIGN KEY (level_id) REFERENCES public.levels(id)
);
CREATE TABLE public.departments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  abbreviation character UNIQUE,
  CONSTRAINT departments_pkey PRIMARY KEY (id)
);
CREATE TABLE public.discipline_records (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid,
  term_id uuid,
  lateness integer DEFAULT 0 CHECK (lateness >= 0),
  unjustified_absences smallint CHECK (unjustified_absences::numeric >= 0::numeric),
  suspensions smallint CHECK (suspensions >= 0),
  punishment_hours smallint CHECK (punishment_hours >= 0),
  warnings ARRAY,
  created_at timestamp with time zone DEFAULT now(),
  conduct text,
  reprimands integer,
  justified_absences smallint,
  academic_year_id uuid,
  level_id bigint,
  CONSTRAINT discipline_records_pkey PRIMARY KEY (id),
  CONSTRAINT discipline_records_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id),
  CONSTRAINT discipline_records_term_id_fkey FOREIGN KEY (term_id) REFERENCES public.terms(id),
  CONSTRAINT fk_discipline_records_academic_year FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id),
  CONSTRAINT discipline_records_level_id_fkey FOREIGN KEY (level_id) REFERENCES public.levels(id)
);
CREATE TABLE public.lecturer_courses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  lecturer_id uuid NOT NULL,
  course_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT lecturer_courses_pkey PRIMARY KEY (id),
  CONSTRAINT lecturer_courses_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id),
  CONSTRAINT lecturer_courses_lecturer_id_fkey FOREIGN KEY (lecturer_id) REFERENCES public.lecturers(id)
);
CREATE TABLE public.lecturers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  full_name text NOT NULL,
  photo_url text,
  created_at timestamp without time zone DEFAULT now(),
  class_master boolean NOT NULL DEFAULT false,
  level_id bigint,
  department_id uuid,
  email text UNIQUE,
  CONSTRAINT lecturers_pkey PRIMARY KEY (id),
  CONSTRAINT lecturers_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT fk_lecturers_level_id FOREIGN KEY (level_id) REFERENCES public.levels(id),
  CONSTRAINT fk_lecturers_department_id FOREIGN KEY (department_id) REFERENCES public.departments(id)
);
CREATE TABLE public.levels (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  name text NOT NULL,
  CONSTRAINT levels_pkey PRIMARY KEY (id)
);
CREATE TABLE public.marks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid,
  course_id uuid,
  term_id uuid,
  ca_score numeric NOT NULL CHECK (ca_score >= 0::numeric AND ca_score <= 20::numeric),
  exam_score numeric NOT NULL CHECK (exam_score >= 0::numeric AND exam_score <= 20::numeric),
  created_at timestamp with time zone DEFAULT now(),
  academic_year_id uuid,
  CONSTRAINT marks_pkey PRIMARY KEY (id),
  CONSTRAINT marks_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id),
  CONSTRAINT marks_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id),
  CONSTRAINT marks_term_id_fkey FOREIGN KEY (term_id) REFERENCES public.terms(id),
  CONSTRAINT fk_marks_academic_year FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role = ANY (ARRAY['admin'::text, 'lecturer'::text])),
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.students (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  gender text NOT NULL CHECK (gender = ANY (ARRAY['Male'::text, 'Female'::text])),
  dob date NOT NULL CHECK (age(dob::timestamp with time zone) >= '10 years'::interval AND age(dob::timestamp with time zone) <= '65 years'::interval),
  pob text,
  photo_url text,
  department_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  matricule text UNIQUE,
  CONSTRAINT students_pkey PRIMARY KEY (id),
  CONSTRAINT students_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id)
);
CREATE TABLE public.terms (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  label text NOT NULL UNIQUE CHECK (label = ANY (ARRAY['First'::text, 'Second'::text, 'Third'::text])),
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  CONSTRAINT terms_pkey PRIMARY KEY (id)
);