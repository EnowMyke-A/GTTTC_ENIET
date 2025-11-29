# Required Database Changes for Lecturer Self-Signup

## Overview
This document outlines the database changes needed to support lecturer self-signup functionality while maintaining admin-only course assignment and class master designation.

## Changes Required

### 1. Update Profile Creation Trigger/Function

You need to modify the database trigger that creates profile records when users sign up. The trigger should:

**For Admin Users:**
- Create a record in `profiles` table with `role='admin'`
- No additional table entries needed

**For Lecturer Users:**
- Create a record in `profiles` table with `role='lecturer'`
- **Automatically create a record in `lecturers` table** with:
  - `user_id` = auth user ID
  - `full_name` = from auth metadata (`user_role_metadata.full_name`)
  - `phone` = `NULL` (can be added later by admin or lecturer)
  - `class_master` = `false` (default)
  - `course_id` = `NULL` (to be assigned by admin)
  - `level_id` = `NULL` (to be assigned by admin if class master)
  - `department_id` = `NULL` (to be assigned by admin if class master)
  - `photo_url` = `NULL`

### 2. Example Trigger Function (PostgreSQL)

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Get role from metadata
  DECLARE
    user_role TEXT := NEW.raw_user_meta_data->>'user_role';
    user_name TEXT := NEW.raw_user_meta_data->>'full_name';
  BEGIN
    -- Create profile record
    INSERT INTO public.profiles (id, full_name, role)
    VALUES (NEW.id, user_name, user_role);
    
    -- If lecturer, create lecturer record
    IF user_role = 'lecturer' THEN
      INSERT INTO public.lecturers (
        user_id, 
        full_name, 
        phone, 
        class_master,
        course_id,
        level_id,
        department_id
      )
      VALUES (
        NEW.id, 
        user_name, 
        NULL, 
        false,
        NULL,
        NULL,
        NULL
      );
    END IF;
    
    RETURN NEW;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 3. Row Level Security (RLS) Policies

Update RLS policies for the `lecturers` table:

```sql
-- Allow lecturers to read their own record
CREATE POLICY "Lecturers can view own record"
  ON public.lecturers
  FOR SELECT
  USING (auth.uid() = user_id);

-- Allow lecturers to update their own basic info (name, phone, photo)
CREATE POLICY "Lecturers can update own basic info"
  ON public.lecturers
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id 
    AND (
      -- Only allow updating these fields
      (OLD.course_id IS NOT DISTINCT FROM NEW.course_id)
      AND (OLD.class_master IS NOT DISTINCT FROM NEW.class_master)
      AND (OLD.level_id IS NOT DISTINCT FROM NEW.level_id)
      AND (OLD.department_id IS NOT DISTINCT FROM NEW.department_id)
    )
  );

-- Allow admins to update course assignments and class master status
CREATE POLICY "Admins can update lecturer assignments"
  ON public.lecturers
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Allow admins to view all lecturers
CREATE POLICY "Admins can view all lecturers"
  ON public.lecturers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
```

### 4. Admin Restriction Check

Ensure there's a constraint or check to prevent multiple admin accounts:

```sql
-- Add a unique partial index to ensure only one admin
CREATE UNIQUE INDEX idx_single_admin 
  ON public.profiles (role) 
  WHERE role = 'admin';
```

## Implementation Steps

1. **Backup your database** before making any changes
2. Create or update the `handle_new_user()` trigger function
3. Apply the RLS policies for the `lecturers` table
4. Add the unique index for admin role restriction
5. Test the signup flow:
   - Sign up as lecturer with email, password, and name
   - Verify profile and lecturer records are created
   - Verify admin cannot be created if one exists
6. Test admin functionality:
   - Admin can assign courses to lecturers
   - Admin can designate lecturers as class masters
   - Admin can assign department and level to class masters

## Verification Queries

After implementation, verify with these queries:

```sql
-- Check if lecturer record was created with signup
SELECT 
  u.email,
  p.full_name,
  p.role,
  l.phone,
  l.course_id,
  l.class_master
FROM auth.users u
JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.lecturers l ON l.user_id = u.id
WHERE p.role = 'lecturer';

-- Verify only one admin exists
SELECT COUNT(*) as admin_count
FROM public.profiles
WHERE role = 'admin';
```

## How It Works Now

### **Lecturer Flow:**
1. Lecturer visits signup page
2. Selects "Lecturer" from role dropdown
3. Enters: Name, Email, Password
4. Signs up → Account created in `auth.users` and `profiles` tables
5. Database trigger automatically creates entry in `lecturers` table
6. Lecturer can sign in immediately
7. **Admin assigns courses and class master status later**

### **Admin Flow:**
1. Admin can only be created if no admin exists
2. Admin role is disabled/locked in UI if admin exists
3. Admin signs up with: Name, Email, Password
4. Admin manages lecturer assignments through Lecturers page
5. Admin can:
   - Assign courses to lecturers
   - Designate lecturers as class masters
   - Assign department and level to class masters
   - Delete lecturer accounts

## Notes

- Lecturers can sign up themselves but cannot assign courses or become class masters
- Only admins can modify `course_id`, `class_master`, `level_id`, and `department_id` fields
- Phone number is optional and can be added later by admin or lecturer
- Admin signup is blocked if an admin already exists (enforced both in UI and database)
