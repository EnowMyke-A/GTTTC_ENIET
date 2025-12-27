import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { academicYearId, termLabel, departmentId, levelId, classId } = await req.json();

    if (!academicYearId || !termLabel) {
      return new Response(JSON.stringify({ error: 'Missing parameters' }), { status: 400, headers: corsHeaders });
    }

    // 1. FETCH ACADEMIC YEAR & TERMS
    const { data: academicYear } = await supabase.from('academic_years').select('*').eq('id', academicYearId).single();
    
    let termIds = [];
    if (termLabel === 'annual') {
      const { data: terms } = await supabase.from('terms').select('id').or(`label.eq.First,label.eq.Second,label.eq.Third`);
      termIds = terms.map(t => t.id);
    } else {
      const { data: term } = await supabase.from('terms').select('id').eq('label', termLabel).single();
      termIds = [term.id];
    }

    // 2. FETCH ENROLLMENT
    let classStudentsQuery = supabase
      .from('class_students')
      .select(`
        student_id, level_id,
        students!inner (id, name, gender, department_id, departments (id, name, abbreviation))
      `)
      .eq('academic_year_id', academicYearId);

    if (classId) classStudentsQuery = classStudentsQuery.eq('class_id', classId);
    else if (levelId) classStudentsQuery = classStudentsQuery.eq('level_id', levelId);

    const { data: classStudentsData, error: csError } = await classStudentsQuery;
    if (csError) throw csError;

    let eligibleStudents = classStudentsData || [];
    if (departmentId && !classId) {
      eligibleStudents = eligibleStudents.filter(cs => cs.students.department_id === departmentId);
    }

    const studentIds = eligibleStudents.map(cs => cs.student_id);

    // 3. FETCH MARKS (PAGINATED AGGREGATION TO BYPASS 1000 ROW LIMIT)
    let marksData = [];
    let from = 0;
    const step = 1000;
    let totalRecords = 0;

    // First fetch to get the data and the total count
    const { data: firstBatch, count, error: marksError } = await supabase
      .from('marks')
      .select(`*, courses (id, name, coefficient, level_id, levels (name))`, { count: 'exact' })
      .eq('academic_year_id', academicYearId)
      .in('term_id', termIds)
      .in('student_id', studentIds)
      .range(from, from + step - 1);

    if (marksError) throw marksError;
    
    marksData = firstBatch || [];
    totalRecords = count || 0;

    // Loop to fetch remaining records if count exceeds 1000
    while (marksData.length < totalRecords) {
      from += step;
      const { data: nextBatch, error: nextError } = await supabase
        .from('marks')
        .select(`*, courses (id, name, coefficient, level_id, levels (name))`)
        .eq('academic_year_id', academicYearId)
        .in('term_id', termIds)
        .in('student_id', studentIds)
        .range(from, from + step - 1);

      if (nextError) throw nextError;
      if (nextBatch) marksData = [...marksData, ...nextBatch];
    }

    // 4. DATA PROCESSING MAPS
    const studentMap = new Map();
    const courseMap = new Map();
    const departmentMap = new Map(); // NEW: Map to track department performance
    const evaluatedCourseIds = new Set();

    eligibleStudents.forEach(cs => {
      studentMap.set(cs.student_id, {
        id: cs.student_id,
        name: cs.students.name,
        gender: cs.students.gender,
        department_id: cs.students.department_id,
        department_name: cs.students.departments?.name,
        department_abbr: cs.students.departments?.abbreviation,
        level_id: cs.level_id,
        totalScore: 0,
        totalCoefficient: 0,
        courseCount: 0,
        marks: []
      });
    });

    marksData.forEach(mark => {
      const studentId = mark.student_id;
      const courseId = mark.course_id;
      const coefficient = mark.courses?.coefficient || 1;
      const totalScore = (mark.ca_score * 0.4) + (mark.exam_score * 0.6);
      const isPassed = totalScore >= 12;
      const isPassedGte10 = totalScore >= 10;
      const isAvgLte5 = totalScore <= 5;

      evaluatedCourseIds.add(courseId);
      const student = studentMap.get(studentId);
      
      if (student) {
        student.totalScore += totalScore * coefficient;
        student.totalCoefficient += coefficient;
        student.courseCount++;
        student.marks.push({ courseId, totalScore, isPassed, isPassedGte10, isAvgLte5, coefficient });

        // Initialize department in departmentMap if not exists
        if (student.department_id && !departmentMap.has(student.department_id)) {
          departmentMap.set(student.department_id, {
            id: student.department_id,
            name: student.department_name,
            abbreviation: student.department_abbr,
            students: [],
            studentsWhoSat: 0,
            totalPassed: 0,
            totalAverage: 0,
            studentCount: 0
          });
        }

        // Add student to department
        const department = departmentMap.get(student.department_id);
        if (department && !department.students.includes(studentId)) {
          department.students.push(studentId);
          department.studentCount++;
        }

        if (!courseMap.has(courseId)) {
          courseMap.set(courseId, {
            id: courseId, 
            name: mark.courses?.name, 
            levelName: mark.courses?.levels?.name,
            // Enrollment stats
            boysEnrolled: 0, 
            girlsEnrolled: 0, 
            // Passed (>=12) stats
            boysPassed: 0, 
            girlsPassed: 0,
            // Passed >=10 stats
            passedGte10: {
              boys: 0,
              girls: 0,
              total: 0,
              boys_percentage: 0,
              girls_percentage: 0,
              total_percentage: 0
            },
            // Average <=5 stats
            avgLte5: {
              boys: 0,
              girls: 0,
              total: 0
            },
            // For averages
            totalScore: 0, 
            studentCount: 0
          });
        }
        
        const course = courseMap.get(courseId);
        course.studentCount++;
        course.totalScore += totalScore;
        
        // Update enrollment counts
        if (student.gender === 'Male') {
          course.boysEnrolled++;
          if (isPassed) course.boysPassed++;
          if (isPassedGte10) course.passedGte10.boys++;
          if (isAvgLte5) course.avgLte5.boys++;
        } else {
          course.girlsEnrolled++;
          if (isPassed) course.girlsPassed++;
          if (isPassedGte10) course.passedGte10.girls++;
          if (isAvgLte5) course.avgLte5.girls++;
        }
      }
    });

    // 5. CALCULATE AVERAGES AND PERCENTAGES
    const studentsWithAverages = Array.from(studentMap.values())
      .filter(s => s.courseCount > 0)
      .map(s => {
        const average = s.courseCount > 0 ? parseFloat((s.totalScore / s.totalCoefficient).toFixed(2)) : 0;
        return {
          ...s,
          average,
          isPassed: average >= 12
        };
      }).sort((a, b) => b.average - a.average);

    // Update department performance metrics
    departmentMap.forEach(dept => {
      // Get all students in this department who have averages
      const deptStudents = studentsWithAverages.filter(s => s.department_id === dept.id);
      dept.studentsWhoSat = deptStudents.length;
      
      if (deptStudents.length > 0) {
        // Calculate pass rate
        dept.totalPassed = deptStudents.filter(s => s.isPassed).length;
        dept.passRate = (dept.totalPassed / dept.studentsWhoSat) * 100;
        
        // Calculate average academic performance
        dept.totalAverage = deptStudents.reduce((sum, s) => sum + s.average, 0);
        dept.averageAcademicPerformance = dept.totalAverage / dept.studentsWhoSat;
      } else {
        dept.passRate = 0;
        dept.averageAcademicPerformance = 0;
      }
      
      // Calculate department score (65% pass rate + 35% average performance)
      // Normalize to 100-point scale (pass rate is already %, average is out of 20)
      const normalizedAverage = (dept.averageAcademicPerformance / 20) * 100;
      dept.departmentScore = (dept.passRate * 0.65) + (normalizedAverage * 0.35);
      dept.departmentScore = parseFloat(dept.departmentScore.toFixed(2));
    });

    const coursesWithAverages = Array.from(courseMap.values())
      .map(c => {
        const totalEnrolled = c.boysEnrolled + c.girlsEnrolled;
        const totalPassedGte10 = c.passedGte10.boys + c.passedGte10.girls;
        const totalAvgLte5 = c.avgLte5.boys + c.avgLte5.girls;
        
        return {
          ...c,
          classAverage: parseFloat((c.totalScore / c.studentCount).toFixed(2)),
          totalEnrolled: totalEnrolled,
          totalPassed: c.boysPassed + c.girlsPassed,
          percentPassedBoys: c.boysEnrolled > 0 ? parseFloat((c.boysPassed / c.boysEnrolled * 100).toFixed(1)) : 0,
          percentPassedGirls: c.girlsEnrolled > 0 ? parseFloat((c.girlsPassed / c.girlsEnrolled * 100).toFixed(1)) : 0,
          percentPassedTotal: totalEnrolled > 0 ? parseFloat(((c.boysPassed + c.girlsPassed) / totalEnrolled * 100).toFixed(1)) : 0,
          // Update passedGte10 with percentages
          passedGte10: {
            ...c.passedGte10,
            total: totalPassedGte10,
            boys_percentage: c.boysEnrolled > 0 ? parseFloat((c.passedGte10.boys / c.boysEnrolled * 100).toFixed(1)) : 0,
            girls_percentage: c.girlsEnrolled > 0 ? parseFloat((c.passedGte10.girls / c.girlsEnrolled * 100).toFixed(1)) : 0,
            total_percentage: totalEnrolled > 0 ? parseFloat((totalPassedGte10 / totalEnrolled * 100).toFixed(1)) : 0
          },
          // Update avgLte5 with total
          avgLte5: {
            ...c.avgLte5,
            total: totalAvgLte5
          }
        };
      }).sort((a, b) => b.classAverage - a.classAverage);

    // 6. OVERALL TOTALS
    const boysStudents = eligibleStudents.filter(cs => cs.students.gender === 'Male').length;
    const girlsStudents = eligibleStudents.filter(cs => cs.students.gender === 'Female').length;
    
    const studentsWhoSatSet = new Set(marksData.map(m => m.student_id));
    const studentsWhoSat = eligibleStudents.filter(cs => studentsWhoSatSet.has(cs.student_id));
    
    const boysWithMarks = studentsWhoSat.filter(cs => cs.students.gender === 'Male').length;
    const girlsWithMarks = studentsWhoSat.filter(cs => cs.students.gender === 'Female').length;

    const passedStudents = studentsWithAverages.filter(s => s.average >= 12);
    const failedStudents = studentsWithAverages.filter(s => s.average < 12);

    // 7. FETCH CONTEXT NAMES FOR HEADER
    let levelName = 'All Levels', deptName = 'All Departments', clsName = 'All Classes';
    if (levelId) { const {data} = await supabase.from('levels').select('name').eq('id', levelId).single(); levelName = data?.name; }
    if (departmentId) { const {data} = await supabase.from('departments').select('name').eq('id', departmentId).single(); deptName = data?.name; }
    if (classId) { const {data} = await supabase.from('classes').select('name').eq('id', classId).single(); clsName = data?.name; }

    // 8. CALCULATE DEPARTMENT PERFORMANCE FOR LINE CHART (only when no department filter)
    let departmentPerformance = null;
    if (!departmentId) {
      const departmentArray = Array.from(departmentMap.values()).filter(dept => dept.studentsWhoSat > 0);
      
      // Sort by department score descending
      departmentArray.sort((a, b) => b.departmentScore - a.departmentScore);
      
      departmentPerformance = {
        labels: departmentArray.map(dept => dept.abbreviation || dept.name),
        datasets: [
          {
            label: 'Department Score',
            data: departmentArray.map(dept => dept.departmentScore),
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.1
          },
          {
            label: 'Pass Rate',
            data: departmentArray.map(dept => dept.passRate),
            borderColor: 'rgb(34, 197, 94)',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            borderDash: [5, 5],
            tension: 0.1
          },
          {
            label: 'Avg Academic Performance',
            data: departmentArray.map(dept => (dept.averageAcademicPerformance / 20) * 100),
            borderColor: 'rgb(249, 115, 22)',
            backgroundColor: 'rgba(249, 115, 22, 0.1)',
            borderDash: [3, 3],
            tension: 0.1
          }
        ],
        details: departmentArray.map(dept => ({
          id: dept.id,
          name: dept.name,
          abbreviation: dept.abbreviation,
          totalStudents: dept.studentCount,
          studentsWhoSat: dept.studentsWhoSat,
          passRate: parseFloat(dept.passRate.toFixed(2)),
          averageAcademicPerformance: parseFloat(dept.averageAcademicPerformance.toFixed(2)),
          departmentScore: dept.departmentScore,
          rank: departmentArray.findIndex(d => d.id === dept.id) + 1
        }))
      };
    }

    // 9. ASSEMBLE FINAL RESPONSE
    const responseData = {
      top3Courses: coursesWithAverages.slice(0, 3).map(c => ({ 
        name: c.name, 
        level: c.levelName, 
        average: c.classAverage, 
        enrollment: c.totalEnrolled, 
        passRate: c.percentPassedTotal,
        passedGte10: c.passedGte10,
        avgLte5: c.avgLte5
      })),
      bottom3Courses: coursesWithAverages.slice(-3).map(c => ({ 
        name: c.name, 
        level: c.levelName, 
        average: c.classAverage, 
        enrollment: c.totalEnrolled, 
        passRate: c.percentPassedTotal,
        passedGte10: c.passedGte10,
        avgLte5: c.avgLte5
      })),
      top3Students: studentsWithAverages.slice(0, 3).map(s => ({ name: s.name, average: s.average, gender: s.gender, level: s.level_id, department: s.department_name })),
      bottom3Students: studentsWithAverages.slice(-3).map(s => ({ name: s.name, average: s.average, gender: s.gender, level: s.level_id, department: s.department_name })),
      passFailStats: {
        passed: { 
          total: passedStudents.length, 
          boys: passedStudents.filter(s => s.gender === 'Male').length, 
          girls: passedStudents.filter(s => s.gender === 'Female').length,
          percentageTotal: studentsWhoSat.length > 0 ? parseFloat((passedStudents.length / studentsWhoSat.length * 100).toFixed(1)) : 0
        },
        failed: { 
          total: failedStudents.length, 
          boys: failedStudents.filter(s => s.gender === 'Male').length, 
          girls: failedStudents.filter(s => s.gender === 'Female').length,
          percentageTotal: studentsWhoSat.length > 0 ? parseFloat((failedStudents.length / studentsWhoSat.length * 100).toFixed(1)) : 0
        }
      },
      enrollmentStats: {
        enrolled: { total: eligibleStudents.length, boys: boysStudents, girls: girlsStudents },
        satForExams: { total: studentsWhoSat.length, boys: boysWithMarks, girls: girlsWithMarks, percentage: eligibleStudents.length > 0 ? parseFloat((studentsWhoSat.length / eligibleStudents.length * 100).toFixed(1)) : 0 }
      },
      summaryDocument: {
        header: { 
          institutionName: "GTTTC KUMBA", 
          academicYear: academicYear?.label, 
          term: termLabel, 
          level: levelName, 
          department: deptName, 
          class: clsName, 
          reportDate: new Date().toISOString().split('T')[0] 
        },
        statistics: coursesWithAverages.map((c, i) => ({
          sn: i + 1, 
          subject: c.name, 
          level: c.levelName,
          enrollment: { boys: c.boysEnrolled, girls: c.girlsEnrolled, total: c.totalEnrolled },
          classAverage: c.classAverage,
          passed: { boys: c.boysPassed, girls: c.girlsPassed, total: c.totalPassed },
          percentPassed: { boys: c.percentPassedBoys, girls: c.percentPassedGirls, total: c.percentPassedTotal },
          // New fields
          passedGte10: {
            boys: c.passedGte10.boys,
            girls: c.passedGte10.girls,
            total: c.passedGte10.total,
            boys_percentage: c.passedGte10.boys_percentage,
            girls_percentage: c.passedGte10.girls_percentage,
            total_percentage: c.passedGte10.total_percentage
          },
          avgLte5: {
            boys: c.avgLte5.boys,
            girls: c.avgLte5.girls,
            total: c.avgLte5.total
          }
        })),
        summary: {
          totalCourses: evaluatedCourseIds.size,
          totalStudents: { total: eligibleStudents.length, boys: boysStudents, girls: girlsStudents },
          studentsWithMarks: { total: studentsWhoSat.length, boys: boysWithMarks, girls: girlsWithMarks, percentage: eligibleStudents.length > 0 ? parseFloat((studentsWhoSat.length / eligibleStudents.length * 100).toFixed(1)) : 0 }
        }
      }
    };

    // Add department performance data only when no department filter
    if (!departmentId && departmentPerformance) {
      responseData.departmentPerformance = departmentPerformance;
    }

    return new Response(JSON.stringify({
      success: true,
      data: responseData,
      metadata: { academicYearId, termLabel, departmentId, levelId, classId, generatedAt: new Date().toISOString() }
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal server error', details: error.message }), { status: 500, headers: corsHeaders });
  }
});