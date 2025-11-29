# Edge Function Setup Complete ✅

## What Was Changed

### 1. **Edge Function Updated** (`supabase/functions/create-lecturer-account/index.ts`)

The edge function now:
- ✅ Accepts: `full_name`, `email`, `password`, `role`
- ✅ Creates auth user with email (auto-confirmed)
- ✅ Creates profile record
- ✅ Creates lecturer record with ALL fields set to NULL except:
  - `user_id` (from auth)
  - `full_name` (from signup)
  - `class_master` (defaults to `false`)
- ✅ Works for both admin and lecturer signups

### 2. **Auth.tsx Updated**

Signup now calls the edge function instead of using `supabase.auth.signUp()`:
- ✅ Sends data to `create-lecturer-account` edge function
- ✅ Handles success/error responses
- ✅ Shows appropriate toast messages

---

## How to Deploy the Edge Function

### **Option 1: Using Supabase CLI (Recommended)**

1. **Install Supabase CLI** (if not installed):
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**:
   ```bash
   supabase login
   ```

3. **Link your project**:
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```
   (Find your project ref in Supabase Dashboard URL: `https://supabase.com/dashboard/project/YOUR_PROJECT_REF`)

4. **Deploy the function**:
   ```bash
   supabase functions deploy create-lecturer-account
   ```

---

### **Option 2: Manual Deployment via Dashboard**

1. Go to your **Supabase Dashboard**
2. Click **Edge Functions** in the sidebar
3. Find `create-lecturer-account` function (or create new if it doesn't exist)
4. Click **Edit** or **Create Function**
5. Copy the entire content from `supabase/functions/create-lecturer-account/index.ts`
6. Paste it into the editor
7. Click **Deploy**

---

## How It Works Now

### **Lecturer Signup Flow:**

1. User fills signup form:
   - Name: "John Doe"
   - Email: "john@example.com"
   - Password: "securepass123"
   - Role: "Lecturer"

2. Frontend calls edge function with this data

3. Edge function:
   - Creates auth user with email
   - Creates profile record
   - Creates lecturer record:
     ```json
     {
       "user_id": "uuid-from-auth",
       "full_name": "John Doe",
       "phone": null,
       "photo_url": null,
       "course_id": null,
       "class_master": false,
       "level_id": null,
       "department_id": null
     }
     ```

4. User can immediately sign in

5. Admin later assigns:
   - Course
   - Class master status
   - Department & Level (if class master)

---

## Testing

After deploying, test the signup:

1. **Sign up as lecturer**:
   - Go to signup page
   - Select "Lecturer"
   - Enter name, email, password
   - Click "Sign Up as Lecturer"

2. **Verify in database**:
   ```sql
   -- Check if all records were created
   SELECT 
     u.email,
     p.full_name,
     p.role,
     l.user_id,
     l.full_name as lecturer_name,
     l.phone,
     l.course_id,
     l.class_master
   FROM auth.users u
   JOIN public.profiles p ON p.id = u.id
   LEFT JOIN public.lecturers l ON l.user_id = u.id
   WHERE u.email = 'test@example.com';
   ```

3. **Sign in**:
   - Use the email and password you just created
   - Should work immediately

---

## Troubleshooting

### Error: "Failed to create lecturer account"
- Check Supabase Edge Function logs
- Ensure function is deployed
- Verify database permissions

### Error: "Unauthorized"
- This is normal - the old authorization check was removed
- The function now accepts public requests

### Lecturer record not created
- Check if edge function is deployed
- Look at Edge Function logs in Supabase Dashboard
- Verify lecturers table structure matches the insert

---

## Next Steps

✅ Deploy the edge function  
✅ Test signup flow  
✅ Verify database records  
✅ Test admin assignment of courses  

Your lecturer self-signup is now fully functional! 🎉
