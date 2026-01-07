import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import LottieAnimation from "@/components/ui/lottie-animation";
import animationData from "@/components/animations/empty box3.json";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  TrendingUp,
  Loader2,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Save,
  RefreshCw,
} from "lucide-react";
import { Loading } from "@/components/ui/loading";

interface StudentRecord {
  id: string;
  student_id: string;
  student_name: string;
  student_matricule: string;
  average: number;
  promotion_status: "promoted" | "repeated" | "pending";
  original_status: "promoted" | "repeated" | "pending";
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

const Council = () => {
  const { userRole } = useAuth();
  const { toast } = useToast();

  const [selectedAcademicYear, setSelectedAcademicYear] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [threshold, setThreshold] = useState("10");

  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [levels, setLevels] = useState<any[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);

  const [loading, setLoading] = useState(true);
  const [fetchingStudents, setFetchingStudents] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (userRole === "admin") {
      fetchInitialData();
    }
  }, [userRole]);

  useEffect(() => {
    if (selectedAcademicYear && selectedDepartment && selectedLevel) {
      fetchStudents();
    } else {
      setStudents([]);
    }
  }, [selectedAcademicYear, selectedDepartment, selectedLevel]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);

      const [yearsResponse, departmentsResponse, levelsResponse] =
        await Promise.all([
          supabase
            .from("academic_years")
            .select("*")
            .order("is_active", { ascending: false }),
          supabase.from("departments").select("*").order("name"),
          supabase.from("levels").select("*").order("id"),
        ]);

      if (yearsResponse.error) throw yearsResponse.error;
      if (departmentsResponse.error) throw departmentsResponse.error;
      if (levelsResponse.error) throw levelsResponse.error;

      setAcademicYears(yearsResponse.data || []);
      setDepartments(departmentsResponse.data || []);
      setLevels(levelsResponse.data || []);

      // Auto-select active academic year
      const activeYear = yearsResponse.data?.find((y) => y.is_active);
      if (activeYear) {
        setSelectedAcademicYear(activeYear.id);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setTimeout(() => {
        setLoading(false);
      }, 500);
    }
  };

  const fetchStudents = async () => {
    if (!selectedAcademicYear || !selectedDepartment || !selectedLevel) return;

    try {
      setFetchingStudents(true);

      // Get all active terms for the academic year
      const { data: termsData } = await supabase
        .from("terms")
        .select("id")
        .order("label");

      if (!termsData || termsData.length === 0) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No terms found for this academic year",
        });
        return;
      }

      // Get class students with their promotion status
      const { data: classStudentsData, error: csError } = await supabase
        .from("class_students")
        .select(
          `
          id,
          student_id,
          promotion_status,
          students!inner (
            id,
            name,
            matricule,
            department_id
          )
        `
        )
        .eq("academic_year_id", selectedAcademicYear)
        .eq("level_id", parseInt(selectedLevel))
        .eq("students.department_id", selectedDepartment);

      if (csError) throw csError;

      if (!classStudentsData || classStudentsData.length === 0) {
        setStudents([]);
        return;
      }

      // Get averages for all students across all terms
      const studentIds = classStudentsData.map((cs: any) => cs.student_id);
      const averagesPromises = studentIds.map(async (studentId: string) => {
        const { data, error } = await supabase.functions.invoke(
          "get-student-average",
          {
            body: {
              studentId,
              termId: termsData[termsData.length - 1].id, // Use last term
              academicYearId: selectedAcademicYear,
              calculateAnnual: true, // Get annual average
            },
          }
        );

        if (error) {
          console.error(`Error getting average for ${studentId}:`, error);
          return { studentId, average: 0 };
        }

        return {
          studentId,
          average: data?.average || 0,
        };
      });

      const averagesResults = await Promise.all(averagesPromises);
      const averagesMap = new Map(
        averagesResults.map((r) => [r.studentId, r.average])
      );

      // Transform data
      const transformedStudents: StudentRecord[] = classStudentsData.map(
        (cs: any) => ({
          id: cs.id,
          student_id: cs.student_id,
          student_name: cs.students.name,
          student_matricule: cs.students.matricule,
          average: averagesMap.get(cs.student_id) || 0,
          promotion_status: cs.promotion_status || "pending",
          original_status: cs.promotion_status || "pending",
        })
      );

      // Sort by average descending
      transformedStudents.sort((a, b) => b.average - a.average);

      setStudents(transformedStudents);
    } catch (error: any) {
      console.error("Error fetching students:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
      setStudents([]);
    } finally {
      setFetchingStudents(false);
    }
  };

  const applyAndSave = async () => {
    setProcessing(true);
    try {
      const thresholdValue = parseFloat(threshold);

      if (isNaN(thresholdValue) || thresholdValue < 0 || thresholdValue > 20) {
        toast({
          variant: "destructive",
          title: "Invalid Threshold",
          description: "Threshold must be between 0 and 20",
        });
        setProcessing(false);
        return;
      }

      // Apply threshold to determine promotion status
      const updatedStudents = students.map((student) => ({
        ...student,
        promotion_status:
          student.average >= thresholdValue ? "promoted" : "repeated",
      }));

      // Prepare updates for database
      const updates = updatedStudents
        .filter((s) => s.promotion_status !== s.original_status)
        .map((s) => ({
          id: s.id,
          promotion_status: s.promotion_status,
          promoted: s.promotion_status === "promoted",
        }));

      if (updates.length === 0) {
        toast({
          title: "No Changes",
          description:
            "All students already have the correct status based on threshold",
        });
        setProcessing(false);
        return;
      }

      // Save to database
      for (const update of updates) {
        const { error } = await supabase
          .from("class_students")
          .update({
            promotion_status: update.promotion_status,
            promoted: update.promoted,
          })
          .eq("id", update.id);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: `Applied threshold and saved decisions for ${updates.length} student(s)`,
      });

      // Refresh students to update original_status
      await fetchStudents();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setProcessing(false);
    }
  };

  const toggleStudentStatus = (studentId: string) => {
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id === studentId) {
          const newStatus =
            s.promotion_status === "promoted" ? "repeated" : "promoted";
          return { ...s, promotion_status: newStatus };
        }
        return s;
      })
    );
  };

  const saveManualChanges = async () => {
    setProcessing(true);
    try {
      const updates = students
        .filter((s) => s.promotion_status !== s.original_status)
        .map((s) => ({
          id: s.id,
          promotion_status: s.promotion_status,
          promoted: s.promotion_status === "promoted",
        }));

      if (updates.length === 0) {
        toast({
          title: "No Changes",
          description: "No manual changes to save",
        });
        setProcessing(false);
        return;
      }

      for (const update of updates) {
        const { error } = await supabase
          .from("class_students")
          .update({
            promotion_status: update.promotion_status,
            promoted: update.promoted,
          })
          .eq("id", update.id);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: `Saved manual changes for ${updates.length} student(s)`,
      });

      // Refresh students to update original_status
      await fetchStudents();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "promoted":
        return "bg-green-500/10 text-green-600 hover:bg-green-500/20";
      case "repeated":
        return "bg-red-500/10 text-red-600 hover:bg-red-500/20";
      default:
        return "bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "promoted":
        return <CheckCircle className="h-4 w-4" />;
      case "repeated":
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const stats = {
    total: students.length,
    promoted: students.filter((s) => s.promotion_status === "promoted").length,
    repeated: students.filter((s) => s.promotion_status === "repeated").length,
    pending: students.filter((s) => s.promotion_status === "pending").length,
    modified: students.filter((s) => s.promotion_status !== s.original_status)
      .length,
  };

  if (userRole !== "admin") {
    return (
      <div className="p-6 text-center">
        <h1 className="text-2xl font-bold text-muted-foreground/85">
          Access Denied
        </h1>
        <p className="text-muted-foreground/80">
          Only administrators can access class council.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="md:p-4 space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-40 bg-muted-foreground/5 animate-pulse rounded-md" />
          <div className="h-4 w-64 bg-muted-foreground/5 animate-pulse rounded-md" />
        </div>
        <Card className="shadow-none border-0 bg-muted-foreground/[0.01]">
          <CardContent className="space-y-4 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 w-24 bg-muted-foreground/5 animate-pulse rounded-md" />
                  <div className="h-10 w-full rounded-md bg-muted-foreground/5 animate-pulse" />
                </div>
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
          Class Council
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground/80">
          Make final decisions on student promotions and repeats
        </p>
      </div>

      {/* Filters */}
      <Card className="text-muted-foreground/85 shadow-none">
        <CardContent className="space-y-4 pt-6 text-muted-foreground/85">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Academic Year</Label>
              <Select
                value={selectedAcademicYear}
                onValueChange={setSelectedAcademicYear}
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
              <Label>Department</Label>
              <Select
                value={selectedDepartment}
                onValueChange={setSelectedDepartment}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {toTitleCase(dept.name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Level</Label>
              <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                <SelectTrigger>
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  {levels.map((level) => (
                    <SelectItem key={level.id} value={level.id.toString()}>
                      Level {toTitleCase(level.name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {students.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-4 items-end pt-6 border-t">
              <div className="flex flex-col gap-4 flex-1">
                <Label>Promotion Threshold (Average)</Label>
                <div className="flex gap-3 flex-wrap">
                  <Input
                    type="number"
                    min="0"
                    max="20"
                    step="0.5"
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                    className="w-32"
                  />
                  <Button
                    onClick={applyAndSave}
                    disabled={processing}
                    className="bg-primary hover:bg-primary/90"
                  >
                    {processing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>Apply & Save</>
                    )}
                  </Button>
                  {stats.modified > 0 && (
                    <Button
                      onClick={saveManualChanges}
                      disabled={processing}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {processing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Changes ({stats.modified})
                        </>
                      )}
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground/85 mt-1">
                  {stats.modified > 0
                    ? "Manual changes detected. Click 'Save Changes' to save, or 'Apply & Save' to reset with threshold."
                    : `Click 'Apply & Save' to apply threshold (≥ ${threshold} = promoted) and save decisions`}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistics */}
      {students.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="shadow-none border-0 bg-muted/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">
                    Total Students
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-none border-0 bg-green-500/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div>
                  <p className="text-2xl font-bold text-green-600">
                    {stats.promoted}
                  </p>
                  <p className="text-xs text-muted-foreground">Promoted</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-none border-0 bg-red-500/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div>
                  <p className="text-2xl font-bold text-red-600">
                    {stats.repeated}
                  </p>
                  <p className="text-xs text-muted-foreground">To Repeat</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-none border-0 bg-yellow-500/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div>
                  <p className="text-2xl font-bold text-yellow-600">
                    {stats.pending}
                  </p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Students Table */}
      {!fetchingStudents &&
        selectedAcademicYear &&
        selectedDepartment &&
        selectedLevel &&
        students.length === 0 && (
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
                    No Students Found
                  </h3>
                  <p className="text-sm text-muted-foreground/80 max-w-md mx-auto">
                    No students are enrolled in the selected class for this
                    academic year.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

      {students.length > 0 && (
        <Card className="shadow-none">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 text-muted-foreground/85">
                    <TableHead className="font-medium">Matricule</TableHead>
                    <TableHead className="font-medium">Student Name</TableHead>
                    <TableHead className="font-medium text-center">
                      Average
                    </TableHead>
                    <TableHead className="font-medium text-center">
                      Status
                    </TableHead>
                    <TableHead className="font-medium text-center">
                      Action
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fetchingStudents ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="animate-spin h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            Loading students...
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    students.map((student, index) => (
                      <TableRow key={student.id} className="hover:bg-muted/30">
                        <TableCell className="text-muted-foreground">
                          {student.student_matricule}
                        </TableCell>
                        <TableCell className="text-muted-foreground/85 font-medium">
                          {student.student_name}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className={`font-bold ${
                              student.average >= 12
                                ? "bg-green-500/10 text-green-600 border-green-200"
                                : student.average >= 10
                                ? "bg-yellow-500/10 text-yellow-600 border-yellow-200"
                                : "bg-red-500/10 text-red-600 border-red-200"
                            }`}
                          >
                            {student.average.toFixed(2)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className={`${getStatusColor(
                              student.promotion_status
                            )} border-0 font-medium flex items-center gap-1 w-fit mx-auto`}
                          >
                            {toTitleCase(student.promotion_status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleStudentStatus(student.id)}
                            className="bg-muted border-0 hover:bg-accent/30"
                          >
                            {student.promotion_status === "promoted"
                              ? "Mark as Repeat"
                              : "Mark as Promoted"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Council;
