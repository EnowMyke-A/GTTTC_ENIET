import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const currentDate = new Date().toISOString().split('T')[0] // YYYY-MM-DD format

    // First, deactivate all currently active academic years and terms
    // This ensures only one can be active at a time
    const { error: deactivateAllAcademicYearsError } = await supabaseClient
      .from('academic_years')
      .update({ is_active: false })
      .eq('is_active', true)

    if (deactivateAllAcademicYearsError) {
      throw deactivateAllAcademicYearsError
    }

    const { error: deactivateAllTermsError } = await supabaseClient
      .from('terms')
      .update({ is_active: false })
      .eq('is_active', true)

    if (deactivateAllTermsError) {
      throw deactivateAllTermsError
    }

    // Now activate academic years that should be active (within date range)
    const { data: academicYearsActivated, error: academicYearsActivateError } = await supabaseClient
      .from('academic_years')
      .update({ is_active: true })
      .lte('start_date', currentDate)
      .gte('end_date', currentDate)
      .select('id, label')

    if (academicYearsActivateError) {
      throw academicYearsActivateError
    }

    // Activate terms that should be active (within date range)
    const { data: termsActivated, error: termsActivateError } = await supabaseClient
      .from('terms')
      .update({ is_active: true })
      .lte('start_date', currentDate)
      .gte('end_date', currentDate)
      .select('id, label')

    if (termsActivateError) {
      throw termsActivateError
    }

    // Get count of deactivated items for reporting
    const { data: academicYearsDeactivated } = await supabaseClient
      .from('academic_years')
      .select('id, label')
      .eq('is_active', false)
      .lt('end_date', currentDate)

    const { data: termsDeactivated } = await supabaseClient
      .from('terms')
      .select('id, label')
      .eq('is_active', false)
      .lt('end_date', currentDate)

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      changes: {
        academic_years: {
          activated: academicYearsActivated || [],
          deactivated: academicYearsDeactivated || []
        },
        terms: {
          activated: termsActivated || [],
          deactivated: termsDeactivated || []
        }
      },
      summary: {
        academic_years_activated: (academicYearsActivated || []).length,
        academic_years_deactivated: (academicYearsDeactivated || []).length,
        terms_activated: (termsActivated || []).length,
        terms_deactivated: (termsDeactivated || []).length
      },
      note: 'All periods are first deactivated, then only those within the current date range are activated to ensure exclusivity'
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in update-active-periods function:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
