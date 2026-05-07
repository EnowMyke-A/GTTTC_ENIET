import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { lecturer_id, academic_year_id, term_id } = await req.json();

    if (!lecturer_id || !academic_year_id || !term_id) {
      throw new Error(
        "lecturer_id, academic_year_id, and term_id are required"
      );
    }

    // 1. Get all courses assigned to this lecturer
    const { data: assignedCourses, error: courseError } = await supabase
      .from("lecturer_courses")
      .select(
        `
        course_id,
        courses (
          id,
          level_id,
          course_departments (department_id)
        )
      `
      )
      .eq("lecturer_id", lecturer_id);

    if (courseError) throw courseError;

    const courseIds = assignedCourses.map((ac) => ac.course_id);
    const numCourses = courseIds.length;

    if (numCourses === 0) {
      return new Response(
        JSON.stringify({
          num_courses: 0,
          unique_students: 0,
          expected_marks: 0,
          actual_marks: 0,
          completion_percentage: 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Identify the target audience (Students in specific Levels/Departments)
    // We need to find students whose department and level match the lecturer's courses
    let totalExpectedMarks = 0;
    const uniqueStudentIds = new Set();

    for (const entry of assignedCourses) {
      const course = entry.courses;
      const deptIds = course.course_departments.map((cd) => cd.department_id);

      const { data: students, error: studentError } = await supabase
        .from("class_students")
        .select("student_id")
        .eq("academic_year_id", academic_year_id)
        .eq("level_id", course.level_id)
        .in(
          "student_id",
          // Subquery logic: filter students by the departments linked to this specific course
          (
            await supabase
              .from("students")
              .select("id")
              .in("department_id", deptIds)
          ).data?.map((s) => s.id) || []
        );

      if (!studentError && students) {
        // Every student found for this specific course counts as one expected mark entry
        totalExpectedMarks += students.length;
        // Add to Set to track unique students across all courses
        students.forEach((s) => uniqueStudentIds.add(s.student_id));
      }
    }

    // 3. Get actual mark entries made so far
    const { count: actualMarks, error: marksError } = await supabase
      .from("marks")
      .select("*", { count: "exact", head: true })
      .eq("term_id", term_id)
      .eq("academic_year_id", academic_year_id)
      .in("course_id", courseIds);

    if (marksError) throw marksError;

    // 4. Calculate Percentage
    const percentage =
      totalExpectedMarks > 0
        ? Math.round((actualMarks / totalExpectedMarks) * 100)
        : 0;

    return new Response(
      JSON.stringify({
        lecturer_id,
        metrics: {
          assigned_courses_count: numCourses,
          unique_students_count: uniqueStudentIds.size,
          expected_mark_entries: totalExpectedMarks,
          actual_mark_entries: actualMarks || 0,
          completion_percentage: `${percentage}%`,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
