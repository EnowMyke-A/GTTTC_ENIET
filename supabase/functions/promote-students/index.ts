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

    const { academic_year_id, next_academic_year_id } = await req.json()

    if (!academic_year_id || !next_academic_year_id) {
      return new Response(
        JSON.stringify({ error: 'academic_year_id and next_academic_year_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get all students with their marks for the academic year
    const { data: students, error: studentsError } = await supabaseClient
      .from('class_students')
      .select(`
        id,
        student_id,
        level_id,
        promoted,
        students!inner (
          id,
          name,
          matricule
        )
      `)
      .eq('academic_year_id', academic_year_id)

    if (studentsError) {
      throw studentsError
    }

    const promotionResults = []

    for (const student of students) {
      // Calculate annual average for this student
      const { data: marks, error: marksError } = await supabaseClient
        .from('marks')
        .select(`
          ca_score,
          exam_score,
          courses!inner (
            coefficient
          )
        `)
        .eq('student_id', student.student_id)
        .eq('academic_year_id', academic_year_id)

      if (marksError) {
        console.error(`Error fetching marks for student ${student.student_id}:`, marksError)
        continue
      }

      // Calculate weighted annual average
      let totalWeightedScore = 0
      let totalCoefficient = 0

      for (const mark of marks) {
        const average = (Number(mark.ca_score) + Number(mark.exam_score)) / 2
        const coefficient = Number(mark.courses.coefficient)
        totalWeightedScore += average * coefficient
        totalCoefficient += coefficient
      }

      const annualAverage = totalCoefficient > 0 ? totalWeightedScore / totalCoefficient : 0

      // Determine promotion status
      const currentLevel = Number(student.level_id)
      let promotionStatus = 'repeated'
      let nextLevel = currentLevel
      let isRepeater = false

      // Check if student was already in this level last year (repeater detection)
      const { data: previousEnrollment } = await supabaseClient
        .from('class_students')
        .select('level_id')
        .eq('student_id', student.student_id)
        .neq('academic_year_id', academic_year_id)
        .eq('level_id', currentLevel)
        .limit(1)

      isRepeater = previousEnrollment && previousEnrollment.length > 0

      // Promotion logic: >= 12.0 average and level <= 2
      if (annualAverage >= 12.0 && currentLevel <= 2) {
        promotionStatus = 'promoted'
        nextLevel = currentLevel + 1
      }

      // Update current enrollment record
      const { error: updateError } = await supabaseClient
        .from('class_students')
        .update({
          promoted: promotionStatus === 'promoted',
          promotion_status: promotionStatus,
          is_repeater: isRepeater
        })
        .eq('id', student.id)

      if (updateError) {
        console.error(`Error updating student ${student.student_id}:`, updateError)
        continue
      }

      // Create enrollment for next academic year
      const { error: enrollmentError } = await supabaseClient
        .from('class_students')
        .insert({
          student_id: student.student_id,
          academic_year_id: next_academic_year_id,
          level_id: nextLevel,
          promoted: false,
          promotion_status: 'pending',
          is_repeater: promotionStatus === 'repeated',
          previous_level_id: currentLevel
        })

      if (enrollmentError) {
        console.error(`Error creating next year enrollment for student ${student.student_id}:`, enrollmentError)
        continue
      }

      promotionResults.push({
        student_id: student.student_id,
        student_name: student.students.name,
        matricule: student.students.matricule,
        current_level: currentLevel,
        next_level: nextLevel,
        annual_average: Math.round(annualAverage * 100) / 100,
        promotion_status: promotionStatus,
        is_repeater: isRepeater
      })
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${promotionResults.length} students`,
        results: promotionResults
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in promote-students function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
