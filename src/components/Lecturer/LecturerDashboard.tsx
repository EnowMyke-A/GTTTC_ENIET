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
  isClassMaster: boolean;
  className: string | null;
}

interface Course {
  id: string;
  name: string;
  code: string | null;
  level_id: string | null;
  department_id: string | null;
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
    isClassMaster: false,
    className: null,
  });
  const [loading, setLoading] = useState(true);
  const [lecturerCourse, setLecturerCourse] = useState<Course | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLecturerData = async () => {
      if (!user) return;

      try {
        setLoading(true);

        // Get lecturer info
        const { data: lecturerData, error: lecturerError } = await supabase
          .from("lecturers")
          .select(
            `
            id,
            course_id,
            courses!lecturers_course_id_fkey (
              id,
              name,
              code,
              level_id,
              department_id
            )
          `
          )
          .eq("user_id", user.id)
          .single();

        if (lecturerError) {
          console.error("Error fetching lecturer:", lecturerError);
          throw lecturerError;
        }

        // Get class master info separately
        const { data: classMasterData } = await supabase
          .from("lecturers")
          .select(
            `
            id,
            level_id,
            department_id,
            departments!fk_lecturers_department_id (
              abbreviation,
              name
            ),
            levels!fk_lecturers_level_id (
              name
            )
          `
          )
          .eq("user_id", user.id)
          .not("level_id", "is", null)
          .not("department_id", "is", null)
          .maybeSingle();

        // Get marks count entered by this lecturer
        const { count: marksCount, error: marksError } = await supabase
          .from("marks")
          .select("*", { count: "exact", head: true })
          .eq("course_id", lecturerData?.course_id || "");

        if (marksError && marksError.code !== "PGRST116") {
          console.error("Error fetching marks:", marksError);
        }

        // Get students count for the course at specific department and level
        let courseStudentsCount = 0;
        const courseData = lecturerData?.courses as any;
        if (courseData && courseData.level_id && courseData.department_id) {
          const { data: academicYearData } = await supabase
            .from("academic_years")
            .select("id")
            .eq("is_active", true)
            .maybeSingle();

          if (academicYearData) {
            // Get students in the same level and department
            const { data: studentsData } = await supabase
              .from("students")
              .select("id")
              .eq("department_id", courseData.department_id);

            if (studentsData && studentsData.length > 0) {
              const studentIds = studentsData.map((s) => s.id);

              const { count: studentsInLevel } = await supabase
                .from("class_students")
                .select("*", { count: "exact", head: true })
                .eq("academic_year_id", academicYearData.id)
                .eq("level_id", courseData.level_id)
                .in("student_id", studentIds);

              courseStudentsCount = studentsInLevel || 0;
            }
          }
        }

        // Get total students if class master
        let totalStudents = 0;
        let className = null;
        let isClassMaster = false;

        if (classMasterData?.level_id && classMasterData?.department_id) {
          isClassMaster = true;
          const { data: academicYearData } = await supabase
            .from("academic_years")
            .select("id")
            .eq("is_active", true)
            .maybeSingle();

          if (academicYearData) {
            const { count: studentsCount } = await supabase
              .from("class_students")
              .select("*", { count: "exact", head: true })
              .eq("academic_year_id", academicYearData.id)
              .eq("level_id", classMasterData.level_id);

            totalStudents = studentsCount || 0;
          }

          // Build class name
          if (classMasterData?.departments && classMasterData?.levels) {
            const deptData = classMasterData.departments as any;
            const levelData = classMasterData.levels as any;
            const deptAbbr = deptData?.abbreviation || deptData?.name || "";
            className = `${deptAbbr}${levelData?.name || ""}`;
          }
        }

        setStats({
          assignedCourses: lecturerData?.course_id ? 1 : 0,
          totalStudents,
          marksEntered: marksCount || 0,
          isClassMaster,
          className,
        });

        if (lecturerData?.courses) {
          const courseData = lecturerData.courses as any;
          if (courseData && !Array.isArray(courseData)) {
            setLecturerCourse({
              id: courseData.id,
              name: courseData.name,
              code: courseData.code,
              level_id: courseData.level_id,
              department_id: courseData.department_id,
            });
          }
        }

        // Update stats with course students count
        setStats((prev) => ({
          ...prev,
          totalStudents: courseStudentsCount,
        }));
      } catch (error: any) {
        console.error("Error fetching lecturer data:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load dashboard data",
        });
      } finally {
        setLoading(false);
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
            <Card key={i} className="shadow-none bg-muted-foreground/[0.01] border-0">
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
                <div key={i} className="h-12 w-full rounded-md bg-muted-foreground/5 animate-pulse" />
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
          ? lecturerCourse?.name || "No course name"
          : "Contact admin for assignment",
      color: "text-blue-600",
      isText: false,
    },
    {
      title: "Total Students",
      value: stats.totalStudents,
      icon: Users,
      description:
        stats.assignedCourses > 0 ? "Taking you course" : "No course assigned",
      color: "text-green-600",
      isText: false,
    },
    {
      title: "Marks Entered",
      value: stats.marksEntered,
      icon: ClipboardList,
      description: "Total marks recorded",
      color: "text-purple-600",
      isText: false,
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
                    {card.value}
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
        {lecturerCourse && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl text-muted-foreground/85">
                Course Information
              </CardTitle>
              <CardDescription>
                Details about your assigned course
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 flex flex-col gap-4">
              <div className="flex gap-3">
                    <div className="bg-muted rounded-[50%] w-[36px] h-[36px] flex items-center justify-center">
                      <BookOpen className="h-4 w-4"/>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-muted-foreground">
                        Course Name
                      </span>
                      <span className="text-sm">
                        {lecturerCourse.name}
                      </span>
                    </div>
                  </div>
                {lecturerCourse.code && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Course Code
                    </p>
                    <p className="text-base font-semibold">
                      {lecturerCourse.code}
                    </p>
                  </div>
                )}
                {stats.isClassMaster && (
                  <div className="flex gap-3">
                    <div className="bg-muted rounded-[50%] w-[36px] h-[36px] flex items-center justify-center">
                      <UserCheck className="h-4 w-4"/>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-muted-foreground">
                        Class Master For
                      </span>
                      <span className="text-sm">
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
