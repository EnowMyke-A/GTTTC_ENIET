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

    const { academic_year_id, level_id } = await req.json()

    // Build query conditions
    let query = supabaseClient
      .from('class_students')
      .select(`
        id,
        student_id,
        level_id,
        is_repeater,
        academic_year_id,
        students!inner (
          id,
          name,
          matricule
        ),
        academic_years!inner (
          id,
          label
        )
      `)

    if (academic_year_id) {
      query = query.eq('academic_year_id', academic_year_id)
    }

    if (level_id) {
      query = query.eq('level_id', level_id)
    }

    const { data: currentEnrollments, error: enrollmentsError } = await query

    if (enrollmentsError) {
      throw enrollmentsError
    }

    const repeaterAnalysis = []

    for (const enrollment of currentEnrollments) {
      // Check if student was in the same level in any previous academic year
      const { data: previousEnrollments, error: previousError } = await supabaseClient
        .from('class_students')
        .select(`
          id,
          level_id,
          academic_year_id,
          academic_years!inner (
            label,
            start_date
          )
        `)
        .eq('student_id', enrollment.student_id)
        .eq('level_id', enrollment.level_id)
        .neq('academic_year_id', enrollment.academic_year_id)
        .order('academic_years(start_date)', { ascending: false })

      if (previousError) {
        console.error(`Error checking previous enrollments for student ${enrollment.student_id}:`, previousError)
        continue
      }

      const isActualRepeater = previousEnrollments && previousEnrollments.length > 0
      const repeatCount = previousEnrollments ? previousEnrollments.length : 0

      // Update the is_repeater flag if it's incorrect
      if (enrollment.is_repeater !== isActualRepeater) {
        const { error: updateError } = await supabaseClient
          .from('class_students')
          .update({ is_repeater: isActualRepeater })
          .eq('id', enrollment.id)

        if (updateError) {
          console.error(`Error updating repeater status for enrollment ${enrollment.id}:`, updateError)
        }
      }

      // Calculate annual average for context
      const { data: marks, error: marksError } = await supabaseClient
        .from('marks')
        .select(`
          ca_score,
          exam_score,
          courses!inner (
            coefficient
          )
        `)
        .eq('student_id', enrollment.student_id)
        .eq('academic_year_id', enrollment.academic_year_id)

      let annualAverage = 0
      if (!marksError && marks && marks.length > 0) {
        let totalWeightedScore = 0
        let totalCoefficient = 0

        for (const mark of marks) {
          const average = (Number(mark.ca_score) + Number(mark.exam_score)) / 2
          const coefficient = Number(mark.courses.coefficient)
          totalWeightedScore += average * coefficient
          totalCoefficient += coefficient
        }

        annualAverage = totalCoefficient > 0 ? totalWeightedScore / totalCoefficient : 0
      }

      repeaterAnalysis.push({
        student_id: enrollment.student_id,
        student_name: enrollment.students.name,
        matricule: enrollment.students.matricule,
        current_level: enrollment.level_id,
        current_academic_year: enrollment.academic_years.label,
        is_repeater: isActualRepeater,
        repeat_count: repeatCount,
        previous_years_in_same_level: previousEnrollments?.map(pe => pe.academic_years.label) || [],
        annual_average: Math.round(annualAverage * 100) / 100,
        status_updated: enrollment.is_repeater !== isActualRepeater
      })
    }

    // Summary statistics
    const totalStudents = repeaterAnalysis.length
    const totalRepeaters = repeaterAnalysis.filter(s => s.is_repeater).length
    const statusUpdates = repeaterAnalysis.filter(s => s.status_updated).length

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        summary: {
          total_students: totalStudents,
          total_repeaters: totalRepeaters,
          repeater_percentage: totalStudents > 0 ? Math.round((totalRepeaters / totalStudents) * 100) : 0,
          status_updates_made: statusUpdates
        },
        students: repeaterAnalysis
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in check-repeaters function:', error)
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
