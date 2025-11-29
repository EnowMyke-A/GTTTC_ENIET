import { createClient } from 'npm:@supabase/supabase-js';

// Initialize Supabase client with service role for admin operations
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Received lecturer signup request');
    const { full_name, email, password, role } = await req.json();
    console.log('Request data:', { full_name, email, role });
    
    // Validate required fields
    if (!full_name || !email || !password || !role) {
      console.error('Validation failed: Missing required fields');
      throw new Error('Missing required fields: full_name, email, password, role');
    }

    // Only allow lecturer role for this function
    if (role !== 'lecturer') {
      console.error('Validation failed: Invalid role');
      throw new Error('This function only handles lecturer signups');
    }

    // Validate full_name
    if (full_name.trim().length < 2) {
      console.error('Validation failed: Full name too short');
      throw new Error('Full name must be at least 2 characters');
    }

    // Create auth account first
    console.log('Creating auth account...');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email.trim(),
      password: password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: full_name.trim(),
        role: role
      }
    });

    if (authError || !authData.user) {
      console.error('Auth account creation error:', authError);
      throw new Error(`Failed to create auth account: ${authError?.message || 'Unknown error'}`);
    }

    console.log('✓ Auth account created successfully:', authData.user.id);

    // Store lecturer information in lecturers table with user_id
    console.log('Creating lecturer record in database...');
    const { data: lecturerData, error: lecturerError } = await supabase
      .from('lecturers')
      .insert({
        user_id: authData.user.id,
        full_name: full_name.trim(),
        email: email.trim(),
        // class_master defaults to false
        // phone, photo_url, course_id, level_id, department_id are nullable - filled by admin
      })
      .select()
      .single();

    if (lecturerError) {
      console.error('Lecturer record creation error:', lecturerError);
      // If lecturer record creation fails, delete the auth account to maintain consistency
      await supabase.auth.admin.deleteUser(authData.user.id);
      throw new Error(`Lecturer registration failed: ${lecturerError.message}`);
    }
    
    console.log('✓ Lecturer record created successfully:', lecturerData.id);

    return new Response(JSON.stringify({
      success: true,
      message: 'Lecturer registration submitted successfully. An admin will review and activate your account.',
      lecturer: {
        id: lecturerData.id,
        full_name: lecturerData.full_name
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201
    });

  } catch (error: any) {
    console.error('Account creation error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to create account',
      details: error.message || String(error),
      stack: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});