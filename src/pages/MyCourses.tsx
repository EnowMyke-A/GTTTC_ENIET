import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loading } from '@/components/ui/loading';
import LottieAnimation from "@/components/ui/lottie-animation";
import animationData from "@/components/animations/empty box3.json";
import { BookOpen, GraduationCap } from 'lucide-react';

interface Course {
  id: string;
  name: string;
  code: string | null;
  coefficient: number;
  level: {
    name: string;
  } | null;
  department: {
    name: string;
    abbreviation: string | null;
  } | null;
}

const MyCourses = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<Course | null>(null);
  const [isClassMaster, setIsClassMaster] = useState(false);
  const [className, setClassName] = useState<string | null>(null);

  useEffect(() => {
    const fetchLecturerCourse = async () => {
      if (!user) return;

      try {
        setLoading(true);

        // Get lecturer info with course details
        const { data: lecturerData, error: lecturerError } = await supabase
          .from("lecturers")
          .select(`
            id,
            course_id,
            courses!lecturers_course_id_fkey (
              id,
              name,
              code,
              coefficient,
              level_id,
              department_id
            )
          `)
          .eq("user_id", user.id)
          .single();

        if (lecturerError) {
          console.error("Error fetching lecturer:", lecturerError);
          throw lecturerError;
        }

        if (lecturerData?.courses) {
          const courseData = lecturerData.courses as any;
          if (courseData && !Array.isArray(courseData)) {
            // Fetch level and department details separately
            const [levelData, deptData] = await Promise.all([
              courseData.level_id
                ? supabase.from("levels").select("name").eq("id", courseData.level_id).single()
                : Promise.resolve({ data: null }),
              courseData.department_id
                ? supabase.from("departments").select("name, abbreviation").eq("id", courseData.department_id).single()
                : Promise.resolve({ data: null }),
            ]);

            setCourse({
              id: courseData.id,
              name: courseData.name,
              code: courseData.code,
              coefficient: courseData.coefficient,
              level: levelData.data,
              department: deptData.data,
            });
          }
        }

        // Check if class master
        const { data: classMasterData } = await supabase
          .from("lecturers")
          .select(`
            id,
            level_id,
            department_id
          `)
          .eq("user_id", user.id)
          .not("level_id", "is", null)
          .not("department_id", "is", null)
          .maybeSingle();

        if (classMasterData?.level_id && classMasterData?.department_id) {
          setIsClassMaster(true);
          
          // Fetch department and level details
          const [deptResult, levelResult] = await Promise.all([
            supabase.from("departments").select("name, abbreviation").eq("id", classMasterData.department_id).single(),
            supabase.from("levels").select("name").eq("id", classMasterData.level_id).single(),
          ]);

          if (deptResult.data && levelResult.data) {
            const deptAbbr = deptResult.data.abbreviation || deptResult.data.name;
            setClassName(`${deptAbbr}${levelResult.data.name}`);
          }
        }
      } catch (error: any) {
        console.error("Error fetching lecturer course:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load course information",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchLecturerCourse();
  }, [user, toast]);

  if (loading) {
    return (
      <div className="md:p-4 space-y-6">
        {/* Header Skeleton */}
        <div className="space-y-2">
          <div className="h-8 w-32 bg-muted-foreground/5 animate-pulse rounded-md" />
          <div className="h-4 w-56 bg-muted-foreground/5 animate-pulse rounded-md" />
        </div>

        {/* Course Card Skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="shadow-none border-0 bg-muted-foreground/[0.01]">
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
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="md:p-4 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-muted-foreground">
            My Courses
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Courses assigned to you
          </p>
        </div>
        <Card className="shadow-none border-0">
          <CardContent className="py-12 pt-6">
            <div className="text-center space-y-4">
              <LottieAnimation
                animationData={animationData}
                width={300}
                height={300}
                loop={true}
                autoplay={true}
                className="m-auto mt-8"
              />
              <div className="space-y-2">
                <h3 className="font-medium text-muted-foreground">
                  No Course Assigned
                </h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  You don't have any courses assigned yet. Please contact the administrator for course assignment.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="md:p-4 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-primary">
          My Courses
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          All courses assigned to you
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-xl">
              <div className="bg-muted p-2 rounded-[50%]">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              {course.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {course.code && (
                <div>
                  <span className="text-sm font-medium">Code:</span>
                  <span className="text-sm text-muted-foreground ml-2">
                    {course.code}
                  </span>
                </div>
              )}
              <div>
                <span className="text-sm font-medium">Coefficient:</span>
                <span className="text-sm text-muted-foreground ml-2">
                  {course.coefficient}
                </span>
              </div>
              {course.level && (
                <div>
                  <span className="text-sm font-medium">Level:</span>
                  <span className="text-sm text-muted-foreground ml-2">
                    {course.level.name}
                  </span>
                </div>
              )}
              {course.department && (
                <div>
                  <span className="text-sm font-medium">Department:</span>
                  <span className="text-sm text-muted-foreground ml-2">
                    {course.department.name}
                  </span>
                </div>
              )}
              
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MyCourses;