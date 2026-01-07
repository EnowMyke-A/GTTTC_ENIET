import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Loading } from "@/components/ui/loading";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BookOpen,
  Users,
  ClipboardList,
  Award,
  PieChart,
  FileBarChart,
  Calendar,
  FileEdit,
  MessageCircle,
  BarChart3,
  UserCheck,
  BookOpenCheck,
} from "lucide-react";

interface LecturerStats {
  assignedCourses: number;
  totalStudents: number;
  marksEntered: number;
  totalMarksExpected: number;
  isClassMaster: boolean;
  className: string | null;
}

interface Course {
  id: string;
  name: string;
  code: string | null;
  level_id: number;
  department_id: string | null;
  coefficient: number;
  description: string | null;
  level?: {
    id: number;
    name: string;
  } | null;
}

const quickActions = [
  {
    label: "Enter student marks",
    icon: <ClipboardList className="h-4 w-4" />,
    to: "/marks",
  },
  {
    label: "View my courses",
    icon: <BookOpen className="h-4 w-4" />,
    to: "/my-courses",
  },
];

const LecturerDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<LecturerStats>({
    assignedCourses: 0,
    totalStudents: 0,
    marksEntered: 0,
    totalMarksExpected: 0,
    isClassMaster: false,
    className: null,
  });
  const [loading, setLoading] = useState(true);
  const [lecturerCourses, setLecturerCourses] = useState<Course[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLecturerData = async () => {
      if (!user) return;

      try {
        setLoading(true);

        // Get lecturer info
        const { data: lecturerData, error: lecturerError } = await supabase
          .from("lecturers")
          .select("id, class_master, level_id, department_id")
          .eq("user_id", user.id)
          .single();

        if (lecturerError) {
          console.error("Error fetching lecturer:", lecturerError);
          throw lecturerError;
        }

        const lecturerId = (lecturerData as any).id;

        // Get all assigned courses from lecturer_courses table
        const { data: lecturerCoursesData, error: lcError } = await (
          supabase as any
        )
          .from("lecturer_courses")
          .select("course_id")
          .eq("lecturer_id", lecturerId);

        if (lcError) {
          console.error("Error fetching lecturer courses:", lcError);
          throw lcError;
        }

        const courseIds =
          lecturerCoursesData?.map((lc: any) => lc.course_id) || [];

        // Fetch full course details
        let coursesData: Course[] = [];
        if (courseIds.length > 0) {
          const { data: fetchedCourses, error: coursesError } = await supabase
            .from("courses")
            .select(
              `
              id,
              name,
              code,
              description,
              coefficient,
              level_id,
              department_id,
              level:levels(id, name)
            `
            )
            .in("id", courseIds);

          if (coursesError) {
            console.error("Error fetching courses:", coursesError);
          } else {
            coursesData = fetchedCourses || [];
          }
        }

        setLecturerCourses(coursesData);

        // Get active academic year and term
        const [academicYearResult, activeTermResult] = await Promise.all([
          supabase
            .from("academic_years")
            .select("id")
            .eq("is_active", true)
            .maybeSingle(),
          supabase
            .from("terms")
            .select("id")
            .eq("is_active", true)
            .maybeSingle(),
        ]);

        const academicYearData = academicYearResult.data;
        const activeTermData = activeTermResult.data;

        // Calculate total unique students taking lecturer's courses for current academic year
        let totalUniqueStudents = 0;
        const uniqueStudentIds = new Set<string>();

        if (academicYearData && courseIds.length > 0) {
          // For each course, get enrolled students
          for (const courseId of courseIds) {
            const course = coursesData.find((c) => c.id === courseId);
            if (!course || !course.department_id || !course.level_id) continue;

            // Get students in this department
            const { data: studentsData } = await supabase
              .from("students")
              .select("id")
              .eq("department_id", course.department_id);

            if (studentsData && studentsData.length > 0) {
              const studentIds = studentsData.map((s) => s.id);

              // Get enrolled students for this level in current academic year
              const { data: enrolledStudents } = await supabase
                .from("class_students")
                .select("student_id")
                .eq("academic_year_id", academicYearData.id)
                .eq("level_id", course.level_id)
                .in("student_id", studentIds);

              if (enrolledStudents) {
                enrolledStudents.forEach((es) =>
                  uniqueStudentIds.add(es.student_id)
                );
              }
            }
          }

          totalUniqueStudents = uniqueStudentIds.size;
        }

        // Calculate marks entered vs expected for active academic year and term
        let marksEntered = 0;
        let totalMarksExpected = 0;

        if (academicYearData && activeTermData && courseIds.length > 0) {
          // Count marks entered for active academic year and term
          const { count: enteredCount, error: marksError } = await supabase
            .from("marks")
            .select("*", { count: "exact", head: true })
            .in("course_id", courseIds)
            .eq("academic_year_id", academicYearData.id)
            .eq("term_id", activeTermData.id);

          if (marksError && marksError.code !== "PGRST116") {
            console.error("Error fetching marks:", marksError);
          } else {
            marksEntered = enteredCount || 0;
          }

          // Calculate expected marks: unique students × number of courses
          totalMarksExpected = totalUniqueStudents * courseIds.length;
        }

        // Get class master info
        let className = null;
        let isClassMaster = false;
        let classMasterStudentsCount = 0;

        const lecturerInfo = lecturerData as any;

        if (
          lecturerInfo.class_master &&
          lecturerInfo.level_id &&
          lecturerInfo.department_id
        ) {
          isClassMaster = true;

          // Get department and level info
          const [deptResult, levelResult] = await Promise.all([
            supabase
              .from("departments")
              .select("name, abbreviation")
              .eq("id", lecturerInfo.department_id)
              .single(),
            supabase
              .from("levels")
              .select("name")
              .eq("id", lecturerInfo.level_id)
              .single(),
          ]);

          if (deptResult.data && levelResult.data) {
            const deptAbbr =
              deptResult.data.abbreviation || deptResult.data.name;
            className = `${deptAbbr}${levelResult.data.name}`;
          }

          // Count class master students
          if (academicYearData) {
            const { data: studentsData } = await supabase
              .from("students")
              .select("id")
              .eq("department_id", lecturerInfo.department_id);

            if (studentsData && studentsData.length > 0) {
              const studentIds = studentsData.map((s) => s.id);

              const { count: studentsCount } = await supabase
                .from("class_students")
                .select("*", { count: "exact", head: true })
                .eq("academic_year_id", academicYearData.id)
                .eq("level_id", lecturerInfo.level_id)
                .in("student_id", studentIds);

              classMasterStudentsCount = studentsCount || 0;
            }
          }
        }

        setStats({
          assignedCourses: courseIds.length,
          totalStudents: isClassMaster
            ? classMasterStudentsCount
            : totalUniqueStudents,
          marksEntered,
          totalMarksExpected,
          isClassMaster,
          className,
        });
      } catch (error: any) {
        console.error("Error fetching lecturer data:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load dashboard data",
        });
      } finally {
        setTimeout(() => {
          setLoading(false);
        }, 500);
      }
    };

    fetchLecturerData();
  }, [user, toast]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-32 bg-muted-foreground/5 animate-pulse rounded-md" />
          <div className="h-4 w-64 bg-muted-foreground/5 animate-pulse rounded-md" />
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card
              key={i}
              className="shadow-none bg-muted-foreground/[0.01] border-0"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-24 bg-muted-foreground/5 animate-pulse rounded-md" />
                <div className="h-10 w-10 rounded-full bg-muted-foreground/5 animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 mb-2 bg-muted-foreground/5 animate-pulse rounded-md" />
                <div className="h-3 w-32 bg-muted-foreground/5 animate-pulse rounded-md" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Content Cards Skeleton */}
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          <Card className="border-0 shadow-none bg-muted-foreground/[0.01]">
            <CardHeader>
              <div className="h-6 w-40 bg-muted-foreground/5 animate-pulse rounded-md" />
              <div className="h-4 w-48 bg-muted-foreground/5 animate-pulse rounded-md mt-2" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3">
                  <div className="h-9 w-9 rounded-full bg-muted-foreground/5 animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-24 bg-muted-foreground/5 animate-pulse rounded-md" />
                    <div className="h-4 w-32 bg-muted-foreground/5 animate-pulse rounded-md" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-none bg-muted-foreground/[0.01]">
            <CardHeader>
              <div className="h-6 w-40 bg-muted-foreground/5 animate-pulse rounded-md" />
              <div className="h-4 w-48 bg-muted-foreground/5 animate-pulse rounded-md mt-2" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-12 w-full rounded-md bg-muted-foreground/5 animate-pulse"
                />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Assigned Courses",
      value: stats.assignedCourses,
      icon: BookOpen,
      description:
        stats.assignedCourses > 0
          ? `${stats.assignedCourses} course${
              stats.assignedCourses > 1 ? "s" : ""
            } assigned`
          : "Contact admin for assignment",
      color: "text-blue-600",
      isText: false,
      displayValue: stats.assignedCourses,
    },
    {
      title: "Total Students",
      value: stats.totalStudents,
      icon: Users,
      description:
        stats.assignedCourses > 0
          ? stats.isClassMaster
            ? "In your class (current year)"
            : "Taking your courses (current year)"
          : "No courses assigned",
      color: "text-green-600",
      isText: false,
      displayValue: stats.totalStudents,
    },
    {
      title: "Marks Entered",
      value: stats.marksEntered,
      icon: ClipboardList,
      description: "For current academic year and term",
      color: "text-purple-600",
      isText: true,
      displayValue: `${stats.marksEntered} / ${stats.totalMarksExpected}`,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-primary">
          Dashboard
        </h1>
        <p className="text-sm mt-1 text-muted-foreground/90">
          Here's an overview of your stats and activities.
        </p>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((card) => (
          <Card
            key={card.title}
            className="hover:bg-muted bg-muted/90 border-[0]"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-bold text-muted-foreground/80">
                {card.title}
              </CardTitle>
              <div className="bg-accent p-3 rounded-[50%]">
                <card.icon className={`h-4 w-4 primary-text`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold min-h-[2rem] flex items-center">
                {loading ? (
                  <div
                    className="w-12 h-6 bg-muted-foreground/5 animate-pulse rounded collapsible-content"
                    data-state="open"
                  ></div>
                ) : (
                  <span className="collapsible-content" data-state="open">
                    {card.displayValue}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {card.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {/* Course Information */}
        {lecturerCourses.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl text-muted-foreground/85">
                Course Information
              </CardTitle>
              <CardDescription>
                Details about your assigned courses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {lecturerCourses.map((course) => (
                  <div
                    key={course.id}
                    className="flex gap-3 p-3 rounded-md bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="bg-primary/10 rounded-[50%] w-[36px] h-[36px] flex items-center justify-center flex-shrink-0">
                      <BookOpen className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-sm font-medium text-muted-foreground/85 truncate">
                        {course.name}
                      </span>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        {course.code && (
                          <span className="bg-muted px-2 py-0.5 rounded">
                            {course.code}
                          </span>
                        )}
                        {course.level && (
                          <span className="bg-muted px-2 py-0.5 rounded">
                            Level {course.level.name}
                          </span>
                        )}
                        <span className="bg-muted px-2 py-0.5 rounded">
                          Coef {course.coefficient}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                {stats.isClassMaster && (
                  <div className="flex gap-3 p-3 rounded-md bg-primary/5 border border-primary/20 mt-4">
                    <div className="bg-primary/10 rounded-[50%] w-[36px] h-[36px] flex items-center justify-center flex-shrink-0">
                      <UserCheck className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-muted-foreground">
                        Class Master For
                      </span>
                      <span className="text-sm font-semibold text-primary">
                        {stats.className}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl text-muted-foreground/85">
              Quick Actions
            </CardTitle>
            <CardDescription>Common Lecturer tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {quickActions.map((action, idx) => (
                <button
                  key={idx}
                  className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-md hover:bg-muted transition-colors text-sm font-medium content-transition"
                  onClick={() => navigate(action.to)}
                  type="button"
                >
                  {action.icon}
                  {action.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LecturerDashboard;
