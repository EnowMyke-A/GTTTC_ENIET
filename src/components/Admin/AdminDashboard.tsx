import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Users,
  GraduationCap,
  BookOpen,
  Building2,
  TrendingUp,
  Award,
  UserCheck,
  Calendar,
  FileText,
  BarChart3,
  ClipboardList,
  Settings,
  Plus,
  PieChart,
  FileBarChart,
  UserPlus,
  UserCog,
  FileEdit,
  FilePlus,
} from "lucide-react";

interface DashboardStats {
  students: number;
  lecturers: number;
  courses: number;
  departments: number;
  classes: number;
  academicYears: number;
}

const recentActivities = [
  {
    icon: <Settings className="h-4 w-4 text-primary" />, // System
    description: "Admin dashboard initialization",
  },
  {
    icon: <UserPlus className="h-4 w-4 text-primary" />, // User
    description: "Student John Doe added to class L6",
  },
  {
    icon: <UserCog className="h-4 w-4 text-primary" />, // Lecturer

    description: "Lecturer Jane Smith assigned to Mathematics",
  },
  {
    icon: <FileBarChart className="h-4 w-4 text-primary" />, // Report
    description: "Academic year 2023/2024 report created",
  },
  {
    icon: <PieChart className="h-4 w-4 text-primary" />, // Analytics

    description: "System analytics refreshed",
  },
];

const quickActions = [
  {
    label: "Add new students",
    icon: <UserPlus className="h-4 w-4" />,
    to: "/students",
  },
  {
    label: "Assign lecturers to courses",
    icon: <UserCog className="h-4 w-4" />,
    to: "/lecturers",
  },
  {
    label: "Generate reports",
    icon: <FileBarChart className="h-4 w-4" />,
    to: "/report-cards",
  },
  {
    label: "Manage academic years",
    icon: <Calendar className="h-4 w-4" />,
    to: "/academic-years",
  },
  {
    label: "Update department information",
    icon: <Building2 className="h-4 w-4" />,
    to: "/departments",
  },
  {
    label: "Monitor system analytics",
    icon: <PieChart className="h-4 w-4" />,
    to: "/analytics",
  },
];

const AdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    students: 0,
    lecturers: 0,
    courses: 0,
    departments: 0,
    classes: 0,
    academicYears: 0,
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [
          studentsResponse,
          lecturersResponse,
          coursesResponse,
          departmentsResponse,
          academicYearsResponse,
        ] = await Promise.all([
          supabase.from("students").select("id", { count: "exact", head: true }),
          supabase.from("lecturers").select("id", { count: "exact", head: true }),
          supabase.from("courses").select("id", { count: "exact", head: true }),
          supabase.from("departments").select("id", { count: "exact", head: true }),
          supabase.from("academic_years").select("id", { count: "exact", head: true }),
        ]);

        const departmentCount = departmentsResponse.count || 0;
        const academicYearCount = academicYearsResponse.count || 0;
        const calculatedClasses = departmentCount * 3 * academicYearCount;

        setStats({
          students: studentsResponse.count || 0,
          lecturers: lecturersResponse.count || 0,
          courses: coursesResponse.count || 0,
          departments: departmentCount,
          classes: calculatedClasses,
          academicYears: academicYearCount,
        });
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        // Set to 0 if there's an error
        setStats({
          students: 0,
          lecturers: 0,
          courses: 0,
          departments: 0,
          classes: 0,
          academicYears: 0,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    {
      title: "Total Students",
      value: stats.students,
      icon: GraduationCap,
      description: "Enrolled students",
      color: "text-blue-600",
    },
    {
      title: "Lecturers",
      value: stats.lecturers,
      icon: UserCheck,
      description: "Active lecturers",
      color: "text-green-600",
    },
    {
      title: "Courses",
      value: stats.courses,
      icon: BookOpen,
      description: "Available courses",
      color: "text-purple-600",
    },
    {
      title: "Departments",
      value: stats.departments,
      icon: Building2,
      description: "Academic departments",
      color: "text-orange-600",
    },
    {
      title: "Classes",
      value: stats.classes,
      icon: Users,
      description: "Active classes",
      color: "text-red-600",
    },
    {
      title: "Academic Years",
      value: stats.academicYears,
      icon: Calendar,
      description: "Recorded academic years",
      color: "text-indigo-600",
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="space-y-2">
          <div className="h-8 w-32 bg-muted-foreground/5 animate-pulse rounded-md" />
          <div className="h-4 w-64 bg-muted-foreground/5 animate-pulse rounded-md" />
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
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
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex gap-3">
                  <div className="h-9 w-9 rounded-full bg-muted-foreground/5 animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-3/4 bg-muted-foreground/5 animate-pulse rounded-md" />
                    <div className="h-3 w-20 bg-muted-foreground/5 animate-pulse rounded-md" />
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
            <CardContent className="space-y-2">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-10 w-full rounded-md bg-muted-foreground/5 animate-pulse" />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-muted-foreground/85">
          Dashboard
        </h1>
        <p className="text-sm mt-1 text-muted-foreground/80">
          General Summary Information of the System
        </p>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((card) => (
          <Card
            key={card.title}
            className="hover:bg-muted bg-muted/90 border-[0]"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-bold text-muted-foreground/85">
                {card.title}
              </CardTitle>
              <div className="bg-accent p-3 rounded-[50%]">
                <card.icon className={`h-4 w-4 primary-text`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold min-h-[2rem] flex items-center">
                <span className="collapsible-content" data-state="open">{card.value}</span>
              </div>
              <p className="text-xs text-muted-foreground/80">
                {card.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {/* Recent Activity Section */}
        <Card className="shadow-[0]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl text-muted-foreground/85">
              Recent Activity
            </CardTitle>
            <CardDescription className="text-muted-foreground/80">Latest activities in the system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 flex flex-col gap-4">
              {recentActivities.map((activity, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-4 activity-item content-transition"
                >
                  <div className="bg-muted p-2 rounded-[50%]">
                    {activity.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground/80 mb-[2px]">
                      {activity.description}
                    </p>
                    <p className="text-primary text-xs">12hrs ago</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions Section */}
        <Card className="shadow-[0]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl text-muted-foreground/85">
              Quick Actions
            </CardTitle>
            <CardDescription className="text-muted-foreground/80">Common administrative tasks</CardDescription>
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

export default AdminDashboard;
