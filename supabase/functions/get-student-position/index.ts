import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('get-student-position function called', new Date().toISOString());
    
    const { studentId, termId, academicYearId, departmentId, levelId } = await req.json();
    console.log('Request parameters:', { studentId, termId, academicYearId, departmentId, levelId });

    if (!studentId || !termId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: studentId, termId' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    // Get all students in the same class/department/level
    let studentsQuery = supabaseClient
      .from('students')
      .select('id');

    if (departmentId) {
      studentsQuery = studentsQuery.eq('department_id', departmentId);
    }

    if (levelId) {
      studentsQuery = studentsQuery
        .select('id, class_students!inner(level_id)')
        .eq('class_students.level_id', levelId);
    }

    const { data: classStudents, error: studentsError } = await studentsQuery;

    if (studentsError) {
      console.error('Error fetching class students:', studentsError);
      throw studentsError;
    }

    console.log('Class students:', classStudents);

    if (!classStudents || classStudents.length === 0) {
      return new Response(
        JSON.stringify({ 
          position: 1,
          totalStudents: 1
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Calculate averages for all students in the class
    const studentAverages = [];

    for (const student of classStudents) {
      // Get marks for this student
      const { data: marks, error: marksError } = await supabaseClient
        .from('marks')
        .select(`
          ca_score,
          exam_score,
          courses!inner(coefficient)
        `)
        .eq('student_id', student.id)
        .eq('term_id', termId)
        .eq('academic_year_id', academicYearId);

      if (marksError) continue; // Skip students with errors

      // Calculate this student's average
      let totalScore = 0;
      let totalCoeff = 0;
      let hasMarks = false;

      if (marks && marks.length > 0) {
        for (const mark of marks) {
          const caScore = mark.ca_score || 0;
          const examScore = mark.exam_score || 0;
          
          if (caScore > 0 || examScore > 0) {
            const subjectTotal = caScore + examScore;
            const coefficient = mark.courses.coefficient;
            totalScore += subjectTotal * coefficient;
            totalCoeff += coefficient;
            hasMarks = true;
          }
        }
      }

      const average = (totalCoeff > 0 && hasMarks) ? totalScore / totalCoeff : 0;
      
      studentAverages.push({
        studentId: student.id,
        average: average
      });
    }

    console.log('All student averages:', studentAverages);

    // Sort by average (descending) to get rankings
    studentAverages.sort((a, b) => b.average - a.average);

    // Find the position of our target student
    const position = studentAverages.findIndex(s => s.studentId === studentId) + 1;
    const totalStudents = studentAverages.length;

    // Get the target student's average
    const targetStudent = studentAverages.find(s => s.studentId === studentId);
    const studentAverage = targetStudent ? targetStudent.average : 0;

    console.log('Final position data:', {
      position,
      totalStudents,
      studentAverage
    });

    return new Response(
      JSON.stringify({
        position: position > 0 ? position : totalStudents, // If not found, put last
        totalStudents,
        average: Math.round(studentAverage * 100) / 100
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in get-student-position function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});