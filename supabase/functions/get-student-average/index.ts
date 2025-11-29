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
    console.log('get-student-average function called', new Date().toISOString());
    
    const { studentId, termId, academicYearId } = await req.json();
    console.log('Request parameters:', { studentId, termId, academicYearId });

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

    // Get student marks for the term and academic year
    const { data: marks, error: marksError } = await supabaseClient
      .from('marks')
      .select(`
        ca_score,
        exam_score,
        courses!inner(coefficient)
      `)
      .eq('student_id', studentId)
      .eq('term_id', termId)
      .eq('academic_year_id', academicYearId);

    if (marksError) {
      console.error('Error fetching marks:', marksError);
      throw marksError;
    }

    console.log('Student marks data:', marks);

    if (!marks || marks.length === 0) {
      return new Response(
        JSON.stringify({ 
          average: 0,
          totalScore: 0,
          coefTotal: 0
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Calculate weighted average
    let totalScore = 0;
    let totalCoeff = 0;
    let validMarks = 0;

    for (const mark of marks) {
      const caScore = mark.ca_score || 0;
      const examScore = mark.exam_score || 0;
      const subjectTotal = (caScore + examScore)/2;
      
      if (caScore > 0 || examScore > 0) { // Only count subjects with some marks
        const coefficient = mark.courses.coefficient;
        totalScore += subjectTotal * coefficient;
        totalCoeff += coefficient;
        validMarks++;
      }
    }

    const average = totalCoeff > 0 ? totalScore / totalCoeff : 0;

    console.log('Calculated average:', {
      average,
      totalScore,
      totalCoeff,
      validMarks
    });

    return new Response(
      JSON.stringify({
        average: Math.round(average * 100) / 100, // Round to 2 decimal places
        totalScore,
        coefTotal: totalCoeff,
        validMarksCount: validMarks
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in get-student-average function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});