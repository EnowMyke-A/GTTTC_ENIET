import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BookOpen, Calendar, Loader2, Save, TrendingUp } from "lucide-react";
import LottieAnimation from "@/components/ui/lottie-animation";
import animationData from "@/components/animations/empty box3.json";

interface Course {
  id: string;
  name: string;
  code: string;
  level_id: number;
  level?: {
    name: string;
  };
}

interface ProgressData {
  id?: string;
  course_id: string;
  term_id: string;
  academic_year_id: string;
  lecturer_id: string;
  topics_planned: number | null;
  topics_taught: number | null;
  periods_planned: number | null;
  periods_taught: number | null;
}

function toTitleCase(value: string): string {
  if (!value) return "";
  return value
    .split(/(\([^)]*\))/g)
    .map((part) => {
      if (part.startsWith("(") && part.endsWith(")")) {
        return part;
      }
      return part.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
    })
    .join("");
}

const CourseProgress = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("");
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [lecturerId, setLecturerId] = useState<string>("");
  const [progressData, setProgressData] = useState<Map<string, ProgressData>>(
    new Map()
  );

  useEffect(() => {
    fetchInitialData();
  }, [user]);

  useEffect(() => {
    if (selectedAcademicYear && selectedTerm && courses.length > 0) {
      fetchProgressData();
    }
  }, [selectedAcademicYear, selectedTerm, courses]);

  const fetchInitialData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Get lecturer ID
      const { data: lecturerData, error: lecturerError } = await supabase
        .from("lecturers")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (lecturerError) throw lecturerError;
      setLecturerId((lecturerData as any).id);

      // Get assigned courses
      const { data: lecturerCoursesData, error: lcError } = await supabase
        .from("lecturer_courses")
        .select("course_id")
        .eq("lecturer_id", (lecturerData as any).id);

      if (lcError) throw lcError;

      const courseIds =
        lecturerCoursesData?.map((lc: any) => lc.course_id) || [];

      if (courseIds.length > 0) {
        const { data: coursesData, error: coursesError } = await supabase
          .from("courses")
          .select(
            `
            id, 
            name, 
            code, 
            level_id,
            level:levels(name)
          `
          )
          .in("id", courseIds)
          .order("name");

        if (coursesError) throw coursesError;
        setCourses(coursesData || []);
      }

      // Get academic years
      const { data: yearsData, error: ayError } = await supabase
        .from("academic_years")
        .select("id, label, is_active")
        .order("created_at", { ascending: false });

      if (ayError) throw ayError;
      setAcademicYears(yearsData || []);

      const activeYear = yearsData?.find((year) => year.is_active);
      if (activeYear) {
        setSelectedAcademicYear(activeYear.id);
      }

      // Get terms
      const { data: termsData, error: termsError } = await supabase
        .from("terms")
        .select("id, label, is_active")
        .order("label");

      if (termsError) throw termsError;
      setTerms(termsData || []);

      const activeTerm = termsData?.find((term) => term.is_active);
      if (activeTerm) {
        setSelectedTerm(activeTerm.id);
      }
    } catch (error: any) {
      console.error("Error fetching initial data:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProgressData = async () => {
    if (!lecturerId || courses.length === 0) return;

    try {
      const { data, error } = await supabase
        .from("course_progress")
        .select("*")
        .eq("lecturer_id", lecturerId)
        .eq("academic_year_id", selectedAcademicYear)
        .eq("term_id", selectedTerm);

      if (error) throw error;

      const progressMap = new Map<string, ProgressData>();
      data?.forEach((item: any) => {
        progressMap.set(item.course_id, item);
      });

      setProgressData(progressMap);
    } catch (error: any) {
      console.error("Error fetching progress data:", error);
      // Don't show error toast if table doesn't exist yet
      if (!error.message?.includes("does not exist")) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message,
        });
      }
    }
  };

  const handleInputChange = (
    courseId: string,
    field: keyof ProgressData,
    value: string
  ) => {
    const numValue = value === "" ? null : parseInt(value);

    setProgressData((prev) => {
      const newMap = new Map(prev);
      const existing = newMap.get(courseId) || {
        course_id: courseId,
        term_id: selectedTerm,
        academic_year_id: selectedAcademicYear,
        lecturer_id: lecturerId,
        topics_planned: null,
        topics_taught: null,
        periods_planned: null,
        periods_taught: null,
      };

      newMap.set(courseId, {
        ...existing,
        [field]: numValue,
      });

      return newMap;
    });
  };

  const calculatePercentage = (
    taught: number | null,
    planned: number | null
  ): string => {
    if (!taught || !planned || planned === 0) return "0";
    return ((taught / planned) * 100).toFixed(1);
  };

  const handleSaveAll = async () => {
    if (!lecturerId || progressData.size === 0) {
      toast({
        variant: "destructive",
        title: "No Data",
        description: "Please enter data before saving",
      });
      return;
    }

    try {
      setSaving(true);

      const dataToSave = Array.from(progressData.values()).map((item) => ({
        id: item.id,
        course_id: item.course_id,
        term_id: selectedTerm,
        academic_year_id: selectedAcademicYear,
        lecturer_id: lecturerId,
        topics_planned: item.topics_planned,
        topics_taught: item.topics_taught,
        periods_planned: item.periods_planned,
        periods_taught: item.periods_taught,
      }));

      const { error } = await supabase
        .from("course_progress")
        .upsert(dataToSave, {
          onConflict: "lecturer_id,course_id,term_id,academic_year_id",
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Course progress data saved successfully",
      });

      // Refresh data
      await fetchProgressData();
    } catch (error: any) {
      console.error("Error saving progress data:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="md:p-4 space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-muted-foreground/5 animate-pulse rounded-md" />
          <div className="h-4 w-96 bg-muted-foreground/5 animate-pulse rounded-md" />
        </div>
        <Card className="shadow-none border-0 bg-muted-foreground/[0.01]">
          <CardContent className="p-6">
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-16 bg-muted-foreground/5 animate-pulse rounded-md"
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="md:p-4 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-muted-foreground/85">
          Course Progress
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground/80">
          Track topics and periods planned and taught for your courses
        </p>
      </div>

      {/* Filters */}
      <Card className="shadow-none">
        <CardContent className="space-y-4 pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-muted-foreground/85">
            <div>
              <Label htmlFor="academic-year">Academic Year (Locked)</Label>
              <Select
                value={selectedAcademicYear}
                onValueChange={setSelectedAcademicYear}
                disabled
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select academic year" />
                </SelectTrigger>
                <SelectContent>
                  {academicYears.map((year) => (
                    <SelectItem key={year.id} value={year.id}>
                      {toTitleCase(year.label)} {year.is_active && "(Current)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="term">Term</Label>
              <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                <SelectTrigger>
                  <SelectValue placeholder="Select term" />
                </SelectTrigger>
                <SelectContent>
                  {terms.map((term) => (
                    <SelectItem key={term.id} value={term.id}>
                      {toTitleCase(term.label)} {term.is_active && "(Current)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Course Progress Table */}
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
                  You don't have any courses assigned yet. Please contact the
                  administrator.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-lg text-muted-foreground/85 flex items-center gap-2">
                Course Progress Data
              </CardTitle>
              <CardDescription>
                Enter the number of topics and periods planned and taught for
                each course
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-medium w-[30%]">
                        Course
                      </TableHead>
                      <TableHead
                        className="font-medium text-center"
                        colSpan={3}
                      >
                        Topics
                      </TableHead>
                      <TableHead
                        className="font-medium text-center"
                        colSpan={3}
                      >
                        Periods
                      </TableHead>
                    </TableRow>
                    <TableRow className="bg-muted/30">
                      <TableHead className="w-[30%]"></TableHead>
                      <TableHead className="text-center text-xs">
                        Planned
                      </TableHead>
                      <TableHead className="text-center text-xs">
                        Taught
                      </TableHead>
                      <TableHead className="text-center text-xs">%</TableHead>
                      <TableHead className="text-center text-xs">
                        Planned
                      </TableHead>
                      <TableHead className="text-center text-xs">
                        Taught
                      </TableHead>
                      <TableHead className="text-center text-xs">%</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {courses.map((course) => {
                      const data = progressData.get(course.id);
                      const topicsPercentage = calculatePercentage(
                        data?.topics_taught || null,
                        data?.topics_planned || null
                      );
                      const periodsPercentage = calculatePercentage(
                        data?.periods_taught || null,
                        data?.periods_planned || null
                      );

                      return (
                        <TableRow key={course.id}>
                          <TableCell className="font-medium w-[20%]">
                            <div className="flex">
                              <p className="text-sm text-muted-foreground/85">
                                {course.name}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground/85">
                                <span>{course.code}</span>
                                {course.level && (
                                  <>
                                    <span>•</span>
                                    <span>
                                      Level {toTitleCase(course.level.name)}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Input
                              type="number"
                              min="0"
                              placeholder="0"
                              value={data?.topics_planned ?? ""}
                              onChange={(e) =>
                                handleInputChange(
                                  course.id,
                                  "topics_planned",
                                  e.target.value
                                )
                              }
                              className="w-[100%] text-center text-muted-foreground/85"
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Input
                              type="number"
                              min="0"
                              placeholder="0"
                              value={data?.topics_taught ?? ""}
                              onChange={(e) =>
                                handleInputChange(
                                  course.id,
                                  "topics_taught",
                                  e.target.value
                                )
                              }
                              className="w-[100%] text-center text-muted-foreground/85"
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-sm font-medium">
                              {topicsPercentage}%
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <Input
                              type="number"
                              min="0"
                              placeholder="0"
                              value={data?.periods_planned ?? ""}
                              onChange={(e) =>
                                handleInputChange(
                                  course.id,
                                  "periods_planned",
                                  e.target.value
                                )
                              }
                              className="w-[100%] text-center text-muted-foreground/85"
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Input
                              type="number"
                              min="0"
                              placeholder="0"
                              value={data?.periods_taught ?? ""}
                              onChange={(e) =>
                                handleInputChange(
                                  course.id,
                                  "periods_taught",
                                  e.target.value
                                )
                              }
                              className="w-[100%] text-center text-muted-foreground/85"
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-sm font-medium">
                              {periodsPercentage}%
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              onClick={handleSaveAll}
              disabled={saving}
              className="min-w-[150px]"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save All Progress
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default CourseProgress;
