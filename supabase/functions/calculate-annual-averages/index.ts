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

    const { academic_year_id, student_id, level_id } = await req.json()

    if (!academic_year_id) {
      return new Response(
        JSON.stringify({ error: 'academic_year_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Build query for students
    let studentsQuery = supabaseClient
      .from('class_students')
      .select(`
        id,
        student_id,
        level_id,
        students!inner (
          id,
          name,
          matricule
        )
      `)
      .eq('academic_year_id', academic_year_id)

    if (student_id) {
      studentsQuery = studentsQuery.eq('student_id', student_id)
    }

    if (level_id) {
      studentsQuery = studentsQuery.eq('level_id', level_id)
    }

    const { data: students, error: studentsError } = await studentsQuery

    if (studentsError) {
      throw studentsError
    }

    const results = []

    for (const student of students) {
      // Get all marks for this student in the academic year
      const { data: marks, error: marksError } = await supabaseClient
        .from('marks')
        .select(`
          ca_score,
          exam_score,
          term_id,
          courses!inner (
            id,
            name,
            coefficient
          ),
          terms!inner (
            id,
            label
          )
        `)
        .eq('student_id', student.student_id)
        .eq('academic_year_id', academic_year_id)

      if (marksError) {
        console.error(`Error fetching marks for student ${student.student_id}:`, marksError)
        continue
      }

      // Group marks by term
      const termAverages = {}
      const subjectDetails = {}

      for (const mark of marks) {
        const termId = mark.term_id
        const courseId = mark.courses.id
        const average = (Number(mark.ca_score) + Number(mark.exam_score)) / 2
        const coefficient = Number(mark.courses.coefficient)

        if (!termAverages[termId]) {
          termAverages[termId] = {
            term_label: mark.terms.label,
            total_weighted: 0,
            total_coefficient: 0,
            subjects: []
          }
        }

        termAverages[termId].total_weighted += average * coefficient
        termAverages[termId].total_coefficient += coefficient
        termAverages[termId].subjects.push({
          course_name: mark.courses.name,
          ca_score: Number(mark.ca_score),
          exam_score: Number(mark.exam_score),
          average: Math.round(average * 100) / 100,
          coefficient: coefficient
        })

        // Track subject for annual calculation
        if (!subjectDetails[courseId]) {
          subjectDetails[courseId] = {
            course_name: mark.courses.name,
            coefficient: coefficient,
            term_averages: []
          }
        }
        subjectDetails[courseId].term_averages.push(average)
      }

      // Calculate term averages
      const termResults = []
      for (const [termId, termData] of Object.entries(termAverages)) {
        const termAverage = termData.total_coefficient > 0 
          ? termData.total_weighted / termData.total_coefficient 
          : 0

        termResults.push({
          term_id: termId,
          term_label: termData.term_label,
          average: Math.round(termAverage * 100) / 100,
          subjects: termData.subjects
        })
      }

      // Calculate annual average
      let annualTotalWeighted = 0
      let annualTotalCoefficient = 0

      for (const [courseId, subject] of Object.entries(subjectDetails)) {
        // Average across all terms for this subject
        const subjectAnnualAverage = subject.term_averages.length > 0
          ? subject.term_averages.reduce((a, b) => a + b, 0) / subject.term_averages.length
          : 0

        annualTotalWeighted += subjectAnnualAverage * subject.coefficient
        annualTotalCoefficient += subject.coefficient
      }

      const annualAverage = annualTotalCoefficient > 0 
        ? annualTotalWeighted / annualTotalCoefficient 
        : 0

      // Determine promotion eligibility
      const currentLevel = Number(student.level_id)
      const isEligibleForPromotion = annualAverage >= 12.0 && currentLevel <= 2

      results.push({
        student_id: student.student_id,
        student_name: student.students.name,
        matricule: student.students.matricule,
        current_level: currentLevel,
        annual_average: Math.round(annualAverage * 100) / 100,
        is_eligible_for_promotion: isEligibleForPromotion,
        next_level: isEligibleForPromotion ? currentLevel + 1 : currentLevel,
        term_averages: termResults.sort((a, b) => a.term_label.localeCompare(b.term_label)),
        total_subjects: Object.keys(subjectDetails).length
      })
    }

    // Summary statistics
    const totalStudents = results.length
    const eligibleForPromotion = results.filter(s => s.is_eligible_for_promotion).length
    const averageScore = results.length > 0 
      ? results.reduce((sum, s) => sum + s.annual_average, 0) / results.length 
      : 0

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        academic_year_id,
        summary: {
          total_students: totalStudents,
          eligible_for_promotion: eligibleForPromotion,
          promotion_rate: totalStudents > 0 ? Math.round((eligibleForPromotion / totalStudents) * 100) : 0,
          class_average: Math.round(averageScore * 100) / 100
        },
        students: results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in calculate-annual-averages function:', error)
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
