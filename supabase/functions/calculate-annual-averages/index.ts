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

    // Fetch the threshold_value for this academic year
    const { data: academicYear, error: academicYearError } = await supabaseClient
      .from('academic_years')
      .select('threshold_value')
      .eq('id', academic_year_id)
      .single()

    if (academicYearError || !academicYear) {
      return new Response(
        JSON.stringify({ error: 'Academic year not found or could not fetch threshold' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const threshold = Number(academicYear.threshold_value ?? 12)
    console.log("[calculate-annual-averages] Fetched academic year threshold:", {
      academic_year_id,
      threshold_value_raw: academicYear.threshold_value,
      threshold_value_type: typeof academicYear.threshold_value,
      threshold,
    });

    // Build query for students
    // ── UPDATED: also pull department_id and department name from students ──
    let studentsQuery = supabaseClient
      .from('class_students')
      .select(`
        id,
        student_id,
        level_id,
        students!inner (
          id,
          name,
          matricule,
          department_id,
          departments (
            id,
            name,
            abbreviation
          )
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
      const termAverages: Record<string, any> = {}
      const subjectDetails: Record<string, any> = {}

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

      for (const [_courseId, subject] of Object.entries(subjectDetails)) {
        const subjectAnnualAverage = subject.term_averages.length > 0
          ? subject.term_averages.reduce((a: number, b: number) => a + b, 0) / subject.term_averages.length
          : 0

        annualTotalWeighted += subjectAnnualAverage * subject.coefficient
        annualTotalCoefficient += subject.coefficient
      }

      const annualAverage = annualTotalCoefficient > 0
        ? annualTotalWeighted / annualTotalCoefficient
        : 0

      const roundedAnnualAverage = Math.round(annualAverage * 100) / 100

      // Determine promotion using dynamic threshold
      const isEligibleForPromotion = roundedAnnualAverage >= threshold
      const promotionStatus = marks.length === 0
        ? 'pending'
        : isEligibleForPromotion ? 'promoted' : 'repeated'

      // Persist promoted + promotion_status back to class_students
      const { error: updateError } = await supabaseClient
        .from('class_students')
        .update({
          promoted: isEligibleForPromotion,
          promotion_status: promotionStatus,
        })
        .eq('id', student.id)

      if (updateError) {
        console.error(
          `Failed to update promotion status for class_student ${student.id}:`,
          updateError
        )
      }

      const currentLevel = Number(student.level_id)

      results.push({
        student_id: student.student_id,
        student_name: student.students.name,
        matricule: student.students.matricule,
        // ── NEW: carry department info on each result for grouping ──────────
        department_id: student.students.department_id,
        department_name: student.students.departments?.name ?? null,
        department_abbreviation: student.students.departments?.abbreviation ?? null,
        // ────────────────────────────────────────────────────────────────────
        current_level: currentLevel,
        annual_average: roundedAnnualAverage,
        promotion_threshold: threshold,
        is_eligible_for_promotion: isEligibleForPromotion,
        promotion_status: promotionStatus,
        next_level: isEligibleForPromotion ? currentLevel + 1 : currentLevel,
        term_averages: termResults.sort((a, b) => a.term_label.localeCompare(b.term_label)),
        total_subjects: Object.keys(subjectDetails).length
      })
    }

    // ── NEW: Compute annual_num_passed % grouped by department + level ──────
    //
    // Key: "<department_id>|<level_id>"
    // For each group we track total enrolled and how many passed (promoted).
    // Students with promotion_status === 'pending' are counted in the
    // denominator (they are enrolled) but NOT in the numerator (not yet passed).
    //
    const groupStats: Record<string, {
      department_id: string | null,
      department_name: string | null,
      department_abbreviation: string | null,
      level_id: number,
      total: number,
      passed: number,
    }> = {}

    for (const r of results) {
      const key = `${r.department_id ?? 'null'}|${r.current_level}`

      if (!groupStats[key]) {
        groupStats[key] = {
          department_id: r.department_id,
          department_name: r.department_name,
          department_abbreviation: r.department_abbreviation,
          level_id: r.current_level,
          total: 0,
          passed: 0,
        }
      }

      groupStats[key].total += 1
      if (r.promotion_status === 'promoted') {
        groupStats[key].passed += 1
      }
    }

    // Build a lookup: "<department_id>|<level_id>" → pass_rate_percentage
    const passRateLookup: Record<string, number> = {}
    for (const [key, stats] of Object.entries(groupStats)) {
      passRateLookup[key] = stats.total > 0
        ? Math.round((stats.passed / stats.total) * 100)
        : 0
    }

    // Attach annual_num_passed (%) to every student result
    for (const r of results) {
      const key = `${r.department_id ?? 'null'}|${r.current_level}`;
      (r as any).annual_num_passed = passRateLookup[key]
    }

    // Department-level pass rate breakdown for the top-level response
    const departmentBreakdown = Object.values(groupStats).map(stats => ({
      department_id: stats.department_id,
      department_name: stats.department_name,
      department_abbreviation: stats.department_abbreviation,
      level_id: stats.level_id,
      total_students: stats.total,
      passed_students: stats.passed,
      annual_num_passed: stats.total > 0
        ? Math.round((stats.passed / stats.total) * 100)
        : 0
    })).sort((a, b) => {
      // Sort by department name then by level
      const deptCompare = (a.department_name ?? '').localeCompare(b.department_name ?? '')
      return deptCompare !== 0 ? deptCompare : a.level_id - b.level_id
    })
    // ─────────────────────────────────────────────────────────────────────────

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
        promotion_threshold: threshold,
        summary: {
          total_students: totalStudents,
          eligible_for_promotion: eligibleForPromotion,
          promotion_rate: totalStudents > 0 ? Math.round((eligibleForPromotion / totalStudents) * 100) : 0,
          class_average: Math.round(averageScore * 100) / 100
        },
        // ── NEW: per-department-per-level breakdown at the top level ─────────
        department_breakdown: departmentBreakdown,
        // ─────────────────────────────────────────────────────────────────────
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