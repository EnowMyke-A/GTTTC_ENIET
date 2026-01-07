import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loading } from '@/components/ui/loading';
import LottieAnimation from "@/components/ui/lottie-animation";
import animationData from "@/components/animations/empty box3.json";
import { BookOpen, GraduationCap, Award } from 'lucide-react';

interface Course {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  coefficient: number;
  level_id: number;
  level?: {
    id: number;
    name: string;
  } | null;
  departments?: {
    id: string;
    name: string;
    abbreviation: string | null;
  }[];
}

const MyCourses = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isClassMaster, setIsClassMaster] = useState(false);
  const [className, setClassName] = useState<string | null>(null);

  useEffect(() => {
    const fetchLecturerCourses = async () => {
      if (!user) return;

      try {
        setLoading(true);

        // Get lecturer ID
        const { data: lecturerData, error: lecturerError } = await supabase
          .from("lecturers")
          .select("id, class_master, level_id, department_id")
          .eq("user_id", user.id)
          .single();

        if (lecturerError) {
          console.error("Error fetching lecturer:", lecturerError);
          throw lecturerError;
        }

        if (!lecturerData) {
          throw new Error("Lecturer record not found");
        }

        // Get all assigned courses from lecturer_courses table
        const { data: lecturerCoursesData, error: lcError } = await supabase
          .from("lecturer_courses")
          .select("course_id")
          .eq("lecturer_id", lecturerData.id);

        if (lcError) {
          console.error("Error fetching lecturer courses:", lcError);
          throw lcError;
        }

        if (!lecturerCoursesData || lecturerCoursesData.length === 0) {
          setCourses([]);
          setLoading(false);
          return;
        }

        // Get course IDs
        const courseIds = lecturerCoursesData.map((lc) => lc.course_id);

        // Fetch full course details with relationships
        const { data: coursesData, error: coursesError } = await supabase
          .from("courses")
          .select(`
            id,
            name,
            code,
            description,
            coefficient,
            level_id,
            level:levels(id, name),
            departments:course_departments(
              department:departments(id, name, abbreviation)
            )
          `)
          .in("id", courseIds)
          .order("name");

        if (coursesError) {
          console.error("Error fetching courses:", coursesError);
          throw coursesError;
        }

        // Transform the data to include departments array
        const transformedCourses = coursesData?.map((course) => ({
          ...course,
          departments: course.departments?.map((cd: any) => cd.department) || [],
        })) || [];

        setCourses(transformedCourses);

        // Check if class master
        if (lecturerData.class_master && lecturerData.level_id && lecturerData.department_id) {
          setIsClassMaster(true);
          
          // Fetch department and level details
          const [deptResult, levelResult] = await Promise.all([
            supabase.from("departments").select("name, abbreviation").eq("id", lecturerData.department_id).single(),
            supabase.from("levels").select("name").eq("id", lecturerData.level_id).single(),
          ]);

          if (deptResult.data && levelResult.data) {
            const deptAbbr = deptResult.data.abbreviation || deptResult.data.name;
            setClassName(`${deptAbbr}${levelResult.data.name}`);
          }
        }
      } catch (error: any) {
        console.error("Error fetching lecturer courses:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load course information",
        });
      } finally {
        setTimeout(() => {
          setLoading(false);
        }, 500);
      }
    };

    fetchLecturerCourses();
  }, [user, toast]);

  function toTitleCase(value: string): string {
    if (!value) return "";

    return value
      .split(/(\([^)]*\))/g)
      .map((part) => {
        if (part.startsWith("(") && part.endsWith(")")) {
          return part;
        }
        return part
          .toLowerCase()
          .replace(/\b\w/g, (char) => char.toUpperCase());
      })
      .join("");
  }

  const getLevelName = (id: number) => {
    const course = courses.find(c => c.level_id === id);
    return course?.level?.name || "Unknown";
  };

  if (loading) {
    return (
      <div className="md:p-4 space-y-6">
        {/* Header Skeleton */}
        <div className="space-y-2">
          <div className="h-8 w-32 bg-muted-foreground/5 animate-pulse rounded-md" />
          <div className="h-4 w-56 bg-muted-foreground/5 animate-pulse rounded-md" />
        </div>

        {/* Course Cards Skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="shadow-none border-0 bg-muted-foreground/[0.01]">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-full bg-muted-foreground/5 animate-pulse" />
                  <div className="h-6 w-40 bg-muted-foreground/5 animate-pulse rounded-md" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="h-4 w-full bg-muted-foreground/5 animate-pulse rounded-md" />
                <div className="h-4 w-3/4 bg-muted-foreground/5 animate-pulse rounded-md" />
                <div className="h-4 w-2/3 bg-muted-foreground/5 animate-pulse rounded-md" />
                <div className="h-4 w-1/2 bg-muted-foreground/5 animate-pulse rounded-md" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="md:p-4 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-muted-foreground/85">
            My Courses
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground/80">
            All courses assigned to you
          </p>
        </div>
        
        {isClassMaster && className && (
          <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 text-sm px-4 py-2">
            {className} Class Master
          </Badge>
        )}
      </div>

      {courses.length === 0 ? (
        <Card className="shadow-none border-0">
          <CardContent className="py-12 pt-6">
            <div className="text-center space-y-4">
              <LottieAnimation
                animationData={animationData}
                width={250}
                height={250}
                loop={true}
                autoplay={true}
                className="m-auto"
              />
              <div className="space-y-2">
                <h3 className="font-medium text-muted-foreground/85">
                  No Courses Assigned
                </h3>
                <p className="text-sm text-muted-foreground/80 max-w-md mx-auto">
                  You don't have any courses assigned yet. Please contact the administrator for course assignment.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <Card key={course.id} className="shadow-[0] flex flex-col hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="bg-muted p-[12px] rounded-[50%]">
                    <BookOpen className="h-4 w-4 text-primary flex-shrink-0" />
                  </div>
                  <span className="truncate text-muted-foreground/85">
                    {toTitleCase(course.name)}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground/80 flex flex-col flex-1">
                <div className="space-y-3 pb-2 flex-1">
                  {course.description && (
                    <div className="collapsible-content" data-state="open">
                      <p className="text-sm text-muted-foreground/85 mt-1 line-clamp-2">
                        {toTitleCase(course.description)}
                      </p>
                    </div>
                  )}
                  
                  {course.code && (
                    <div>
                      <span className="text-sm font-medium">Code:</span>
                      <span className="text-sm text-muted-foreground ml-2">
                        {course.code}
                      </span>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <Badge
                      variant="outline"
                      className="w-fit inline border-0 bg-muted"
                    >
                      COEF {course.coefficient}
                    </Badge>
                    {course.level && (
                      <Badge
                        variant="outline"
                        className="w-fit inline border-0 bg-muted"
                      >
                        Level {toTitleCase(course.level.name)}
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap gap-1">
                      {course.departments && course.departments.length > 0 ? (
                        course.departments.map((dept) => (
                          <Badge
                            variant="outline"
                            key={dept.id}
                            className="text-xs bg-muted hover:bg-accent/30 border-0 content-transition"
                          >
                            {dept.abbreviation || dept.name}
                          </Badge>
                        ))
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-xs bg-muted/50 text-muted-foreground border-0"
                        >
                          No departments
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyCourses;