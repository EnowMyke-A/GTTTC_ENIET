import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  courseId: string;
  termId: string;
  academicYearId: string;
}

Deno.serve(async (req) => {
  console.log("get-student-marks function called", new Date().toISOString());

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const { courseId, termId, academicYearId }: RequestBody = await req.json();
    console.log("Request parameters:", { courseId, termId, academicYearId });

    if (!courseId || !termId || !academicYearId) {
      return new Response(
        JSON.stringify({
          error:
            "Missing required parameters: courseId, termId, academicYearId",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get course details
    const { data: courseData, error: courseError } = await supabase
      .from("courses")
      .select("*")
      .eq("id", courseId)
      .single();

    if (courseError) {
      console.error("Error fetching course:", courseError);
      return new Response(JSON.stringify({ error: "Course not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Course data:", courseData);

    // Get departments associated with this course
    const { data: courseDepartmentsData, error: cdError } = await supabase
      .from("course_departments")
      .select("department_id")
      .eq("course_id", courseId);

    if (cdError) {
      console.error("Error fetching course departments:", cdError);
    }

    const courseDepartmentIds =
      courseDepartmentsData?.map((cd: any) => cd.department_id) || [];
    console.log("Course department IDs:", courseDepartmentIds);

    // Get students enrolled in the same level as the course for the selected academic year
    const { data: classStudentsData, error: csError } = await supabase
      .from("class_students")
      .select(
        `
        student_id,
        students!inner (
          id,
          name,
          matricule,
          department_id
        )
      `
      )
      .eq("academic_year_id", academicYearId)
      .eq("level_id", courseData.level_id);

    if (csError) {
      console.error("Error fetching class students:", csError);
      return new Response(
        JSON.stringify({ error: "Error fetching students" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Class students data:", classStudentsData);

    let eligibleStudents = classStudentsData || [];

    // Filter by course departments if any are specified
    if (courseDepartmentIds.length > 0) {
      eligibleStudents = eligibleStudents.filter((cs: any) =>
        courseDepartmentIds.includes(cs.students.department_id)
      );
    }

    console.log("Eligible students after filtering:", eligibleStudents);

    // Get existing marks for these students
    const studentIds = eligibleStudents.map((cs: any) => cs.student_id);
    const { data: marksData, error: marksError } = await supabase
      .from("marks")
      .select("*")
      .eq("course_id", courseId)
      .eq("term_id", termId)
      .in("student_id", studentIds);

    if (marksError) {
      console.error("Error fetching marks:", marksError);
      return new Response(JSON.stringify({ error: "Error fetching marks" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Marks data:", marksData);

    // Combine student data with marks
    const studentMarksData = eligibleStudents.map((cs: any) => {
      const student = cs.students;
      const existingMark = marksData?.find(
        (m: any) => m.student_id === student.id
      );

      return {
        student_id: student.id,
        student_name: student.name,
        student_matricule: student.matricule,
        student_department_id: student.department_id,
        ca_score:
          existingMark?.ca_score !== undefined ? existingMark.ca_score : null,
        exam_score:
          existingMark?.exam_score !== undefined
            ? existingMark.exam_score
            : null,
        total_score:
          existingMark?.total_score !== undefined
            ? existingMark.total_score
            : null,
        grade: existingMark?.grade !== undefined ? existingMark.grade : null,
        mark_id: existingMark?.id,
      };
    });

    console.log("Final student marks data:", studentMarksData);

    return new Response(
      JSON.stringify({
        success: true,
        data: studentMarksData,
        course: courseData,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
