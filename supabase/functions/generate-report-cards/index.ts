import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
    });
  }

  try {
    console.log(
      "generate-report-cards function called",
      new Date().toISOString()
    );

    console.log("Parsing request body...");
    const {
      studentId,
      termId,
      academicYearId,
      departmentId,
      levelId,
      format = "json",
    } = await req.json();
    
    console.log("Request parameters:", {
      studentId,
      termId,
      academicYearId,
      departmentId,
      levelId,
      format
    });

    if (!termId || !academicYearId) {
      return new Response(
        JSON.stringify({
          error: "Missing required parameters: termId, academicYearId",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    console.log("Creating Supabase client...");
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Function to get class master for a specific department and level
    const getClassMaster = async (departmentId: string, levelId: number) => {
      try {
        const { data: classMaster, error } = await supabaseClient
          .from("lecturers")
          .select("full_name")
          .eq("class_master", true)
          .eq("department_id", departmentId)
          .eq("level_id", levelId)
          .maybeSingle();

        if (error) {
          console.error("Error fetching class master:", error);
          return "N/A";
        }

        return classMaster?.full_name || "N/A";
      } catch (error) {
        console.error("Error in getClassMaster:", error);
        return "N/A";
      }
    };
    
    console.log("Fetching academic year and term details...");
    const { data: academicYear, error: academicYearError } = await supabaseClient
      .from("academic_years")
      .select("id, label")
      .eq("id", academicYearId)
      .single();

    if (academicYearError) {
      console.error("Error fetching academic year:", academicYearError);
      throw academicYearError;
    }

    const { data: term, error: termError } = await supabaseClient
      .from("terms")
      .select("id, label")
      .eq("id", termId)
      .single();

    if (termError) {
      console.error("Error fetching term:", termError);
      throw termError;
    }
    
    console.log("Academic year and term fetched successfully:", { academicYear, term });

    // Fetch students with proper joins
    console.log("Starting to fetch students...");
    let studentsToProcess: any[] = [];
    if (studentId) {
      console.log("Fetching single student with ID:", studentId);
      const { data: student, error: studentError } = await supabaseClient
        .from("students")
        .select(`
          id,
          name,
          matricule,
          photo_url,
          gender,
          dob,
          pob,
          departments!inner(id, name, abbreviation),
          class_students!inner(
            level_id,
            is_repeater,
            promotion_status,
            previous_level_id,
            levels!class_students_level_id_fkey!inner(id, name),
            previous_levels:levels!fk_previous_level(id, name)
          )
        `)
        .eq("id", studentId)
        .eq("class_students.academic_year_id", academicYearId)
        .single();

      if (studentError) throw studentError;
      studentsToProcess = [student];
    } else {
      let query = supabaseClient
        .from("students")
        .select(`
          id,
          name,
          matricule,
          photo_url,
          gender,
          dob,
          pob,
          departments!inner(id, name, abbreviation),
          class_students!inner(
            level_id,
            is_repeater,
            promotion_status,
            previous_level_id,
            levels!class_students_level_id_fkey!inner(id, name),
            previous_levels:levels!fk_previous_level(id, name)
          )
        `)
        .eq("class_students.academic_year_id", academicYearId);

      if (departmentId) query = query.eq("department_id", departmentId);
      if (levelId) query = query.eq("class_students.level_id", levelId);

      const { data: students, error: studentsError } = await query.order("name");
      if (studentsError) throw studentsError;
      studentsToProcess = students || [];
    }

    const reportCards: any[] = [];
    
    for (const student of studentsToProcess) {
      try {
        // Fetch marks for student in this term & year
        const { data: marks } = await supabaseClient
          .from("marks")
          .select(`
            ca_score,
            exam_score,
            courses!inner(id, name, coefficient)
          `)
          .eq("student_id", student.id)
          .eq("term_id", termId)
          .eq("academic_year_id", academicYearId);

        // Fetch discipline records
        const { data: disciplineRecord } = await supabaseClient
          .from("discipline_records")
          .select("*")
          .eq("student_id", student.id)
          .eq("term_id", termId)
          .eq("academic_year_id", academicYearId)
          .maybeSingle();

        const studentMarks: any[] = [];
        for (const mark of marks || []) {
          const ca = mark.ca_score || 0;
          const exam = mark.exam_score || 0;
          const average = (ca + exam)/2;
          
          // Get min/max for this subject in the same class/level
          const studentLevelId = student.class_students?.[0]?.level_id;
          const { data: subjectMarks } = await supabaseClient
            .from("marks")
            .select(`
              ca_score, 
              exam_score,
              students!inner(class_students!inner(level_id))
            `)
            .eq("term_id", termId)
            .eq("academic_year_id", academicYearId)
            .eq("course_id", mark.courses.id)
            .eq("students.class_students.level_id", studentLevelId);

          const allAverages = (subjectMarks || []).map(
            (m: any) => ((m.ca_score || 0) + (m.exam_score || 0))/2
          );
          const minVal = allAverages.length ? Math.min(...allAverages) : 0;
          const maxVal = allAverages.length ? Math.max(...allAverages) : 0;

          studentMarks.push({
            subject: mark.courses.name,
            competencies: "N/A",
            ca_score: ca,
            exam_score: exam,
            average: average,
            coef: mark.courses.coefficient,
            weighted_average: average * mark.courses.coefficient,
            grade: average >= 18.5 ? "A" : average >= 16.5 ? "B" : average >= 15.5 ? "C" : average >= 13.5 ? "D" : average >= 12 ? "E" : "F",
            min_max_average: `${minVal.toFixed(1)} - ${maxVal.toFixed(1)}`,
            remark_on_average: average >= 18.5 ? "Excellent" : 
                               average >= 16.5 ? "Very Good" :
                               average >= 14.5 ? "Good" :
                               average >= 13.5 ? "Fair" :
                               average >= 12.0 ? "Average" :
                               average >= 10.0 ? "Below Avg" :
                               average >= 8.0 ? "Poor" :
                               average >= 6.0 ? "Very Poor" : "Weak",
          });
        }

        // Calculate student totals
        const totalWeightedScore = studentMarks.reduce((sum, s) => sum + s.weighted_average, 0);
        const totalCoef = studentMarks.reduce((sum, s) => sum + s.coef, 0);
        const termAverage = totalCoef > 0 ? totalWeightedScore / totalCoef : 0;

        // Calculate annual average if this is third term
        let annualAverage = 0;
        let annualNumPassed = 0;
        
        if (term && term.label.toLowerCase().includes("third")) {
          const { data: allYearMarks } = await supabaseClient
            .from("marks")
            .select("ca_score, exam_score, courses!inner(coefficient), terms!inner(label)")
            .eq("student_id", student.id)
            .eq("academic_year_id", academicYearId);

          const termGroups: Record<string, { total: number; coef: number }> = {};
          
          for (const m of allYearMarks || []) {
            const avg = ((m.ca_score || 0) + (m.exam_score || 0))/2;
            const weighted = avg * (m.courses.coefficient || 1);
            const termLabel = m.terms.label;
            
            if (!termGroups[termLabel]) {
              termGroups[termLabel] = { total: 0, coef: 0 };
            }
            termGroups[termLabel].total += weighted;
            termGroups[termLabel].coef += m.courses.coefficient || 1;
          }

          const termAverages = Object.values(termGroups).map((g) =>
            g.coef > 0 ? g.total / g.coef : 0
          );
          
          annualAverage = termAverages.length 
            ? termAverages.reduce((a, b) => a + b, 0) / termAverages.length 
            : 0;
          annualNumPassed = annualAverage >= 12 ? 1 : 0;
        }

        // Format discipline data to match template expectations
        const disciplineData = {
          unjustified_abs: disciplineRecord?.unjustified_absences?.toString() || "0",
          justified_abs: disciplineRecord?.justified_absences?.toString() || "0", 
          late: disciplineRecord?.lateness?.toString() || "0",
          punishment: disciplineRecord?.punishment_hours?.toString() || "0",
          conduct: disciplineRecord?.conduct || "Good",
          warning: disciplineRecord?.warnings?.length?.toString() || "0",
          reprimand: disciplineRecord?.reprimands?.toString() || "0",
          suspension: disciplineRecord?.suspensions?.toString() || "0",
        };

        // Get repeater information from class_students
        const classStudentInfo = student.class_students?.[0];
        const isRepeater = classStudentInfo?.is_repeater || false;
        const promotionStatus = classStudentInfo?.promotion_status || "pending";
        const previousLevelName = classStudentInfo?.previous_levels?.name || null;

        // Get class master for this student's class (department + level combination)
        const studentDepartmentId = student.departments?.id;
        const studentLevelId = classStudentInfo?.level_id;
        const classMasterName = studentDepartmentId && studentLevelId 
          ? await getClassMaster(studentDepartmentId, studentLevelId)
          : "N/A";

        // Get performance remark based on average
        const performanceRemark = termAverage >= 18.5 ? "Excellent" : 
                                termAverage >= 16.5 ? "Very Good" :
                                termAverage >= 14.5 ? "Good" :
                                termAverage >= 13.5 ? "Fair" :
                                termAverage >= 12.0 ? "Average" :
                                termAverage >= 10.0 ? "Below Avg" :
                                termAverage >= 8.0 ? "Poor" :
                                termAverage >= 6.0 ? "Very Poor" : "Weak";

        // Assemble report card data matching template structure
        const reportCard = {
          academic_year: academicYear?.label || "N/A",
          term: term?.label || "N/A", 
          student_name: student.name,
          dob: student.dob || "N/A",
          pob: student.pob || "N/A",
          department: student.departments?.abbreviation || "N/A",
          level: classStudentInfo?.levels?.name || "N/A",
          gender: student.gender,
          num_subjects: studentMarks.length,
          student_id: student.matricule || "N/A",
          num_passed: studentMarks.filter((s) => s.average >= 12).length,
          repeater: isRepeater ? "Yes" : "No",
          promotion_status: promotionStatus,
          previous_level: previousLevelName,
          class_master: classMasterName,
          student_photo_base64: student.photo_url || null,
          subjects: studentMarks,
          discipline: disciplineData,
          performance: {
            total_weighted_score: totalWeightedScore,
            total_coef: totalCoef,
            class_postion: "0", // Will be calculated after all students processed
            term_average: Math.round(termAverage * 100) / 100,
            performance_remark: performanceRemark,
          },
          class_profile: {
            class_average: 0, // Will be calculated after all students processed
            min_max: "0 - 0", // Will be calculated after all students processed
            num_enrolled: 0, // Will be calculated after all students processed
            num_passed: 0, // Will be calculated after all students processed
            annual_average: Math.round(annualAverage * 100) / 100,
            annual_num_passed: annualNumPassed,
          },
          repeater_info: {
            is_repeater: isRepeater,
            promotion_status: promotionStatus,
            previous_level_id: classStudentInfo?.previous_level_id || null,
            previous_level_name: previousLevelName
          }
        };

        reportCards.push(reportCard);
      } catch (err) {
        console.error("Error processing student:", student.id, err);
        continue;
      }
    }
    // Handle single student case vs bulk processing
    if (studentId) {
      // For single student, we need to get class statistics from all students in the same class
      const singleStudentCard = reportCards[0];
      if (singleStudentCard) {
        // Get the actual level_id and department_id from the student data
        const studentLevelId = studentsToProcess[0]?.class_students?.[0]?.level_id;
        const studentDepartmentId = studentsToProcess[0]?.departments?.id;
        
        // Get all students in the same class for statistics
        const { data: classStudents } = await supabaseClient
          .from("students")
          .select(`
            id,
            class_students!inner(level_id),
            departments!inner(id)
          `)
          .eq("class_students.academic_year_id", academicYearId)
          .eq("class_students.level_id", studentLevelId)
          .eq("departments.id", studentDepartmentId);

        // Calculate class averages for statistics
        const classAverages: number[] = [];
        let classPassed = 0;
        
        for (const classStudent of classStudents || []) {
          const { data: studentMarks } = await supabaseClient
            .from("marks")
            .select("ca_score, exam_score, courses!inner(coefficient)")
            .eq("student_id", classStudent.id)
            .eq("term_id", termId)
            .eq("academic_year_id", academicYearId);

          if (studentMarks && studentMarks.length > 0) {
            let totalWeighted = 0;
            let totalCoef = 0;
            
            for (const mark of studentMarks) {
              const avg = ((mark.ca_score || 0) + (mark.exam_score || 0)) / 2;
              totalWeighted += avg * (mark.courses.coefficient || 1);
              totalCoef += mark.courses.coefficient || 1;
            }
            
            const studentAvg = totalCoef > 0 ? totalWeighted / totalCoef : 0;
            classAverages.push(studentAvg);
            if (studentAvg >= 12) classPassed++;
          }
        }

        const classAvg = classAverages.length ? classAverages.reduce((a, b) => a + b, 0) / classAverages.length : 0;
        const min = classAverages.length ? Math.min(...classAverages) : 0;
        const max = classAverages.length ? Math.max(...classAverages) : 0;
        
        // Find student's rank - sort averages in descending order and find position
        const sortedAverages = [...classAverages].sort((a, b) => b - a);
        const studentAverage = singleStudentCard.performance.term_average;
        
        // Find rank by counting how many students have higher averages
        let studentRank = 1;
        for (const avg of sortedAverages) {
          if (avg > studentAverage) {
            studentRank++;
          } else {
            break;
          }
        }
        
        console.log(`Student average: ${studentAverage}, Class averages: ${JSON.stringify(sortedAverages)}, Calculated rank: ${studentRank}`);

        // Update single student card with class statistics
        singleStudentCard.performance.class_postion = studentRank.toString();
        singleStudentCard.class_profile.class_average = Math.round(classAvg * 100) / 100;
        singleStudentCard.class_profile.min_max = `${min.toFixed(2)} - ${max.toFixed(2)}`;
        singleStudentCard.class_profile.num_enrolled = classAverages.length;
        singleStudentCard.class_profile.num_passed = classPassed;
      }

      console.log(`Generated report card for single student successfully`);

      return new Response(
        JSON.stringify({
          success: true,
          format,
          data: reportCards,
          summary: {
            total_students: 1,
            class_average: singleStudentCard?.class_profile.class_average || 0,
            students_passed: singleStudentCard?.performance.term_average >= 12 ? 1 : 0,
            pass_rate: singleStudentCard?.performance.term_average >= 12 ? 100 : 0
          }
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    } else {
      // Bulk processing - calculate class statistics and rankings
      reportCards.sort((a, b) => b.performance.term_average - a.performance.term_average);
      
      const averages = reportCards.map((c) => c.performance.term_average);
      const classAvg = averages.length ? averages.reduce((a, b) => a + b, 0) / averages.length : 0;
      const min = averages.length ? Math.min(...averages) : 0;
      const max = averages.length ? Math.max(...averages) : 0;
      const numPassed = averages.filter((a) => a >= 12).length;

      // Update each report card with rankings and class profile
      reportCards.forEach((card, i) => {
        card.performance.class_postion = (i + 1).toString();
        card.class_profile.class_average = Math.round(classAvg * 100) / 100;
        card.class_profile.min_max = `${min.toFixed(2)} - ${max.toFixed(2)}`;
        card.class_profile.num_enrolled = reportCards.length;
        card.class_profile.num_passed = numPassed;
      });

      console.log(`Generated ${reportCards.length} report cards successfully`);

      return new Response(
        JSON.stringify({
          success: true,
          format,
          data: reportCards,
          summary: {
            total_students: reportCards.length,
            class_average: Math.round(classAvg * 100) / 100,
            students_passed: numPassed,
            pass_rate: reportCards.length > 0 ? Math.round((numPassed / reportCards.length) * 100) : 0
          }
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

  } catch (error) {
    console.error("Error in generate-report-cards:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        details: "Failed to generate report cards"
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
