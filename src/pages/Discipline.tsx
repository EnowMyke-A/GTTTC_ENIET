import { useState, useEffect } from "react";
import LottieAnimation from "@/components/ui/lottie-animation";
import animationData from "@/components/animations/empty box3.json";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loading,
  LoadingOverlay,
  LoadingInline,
} from "@/components/ui/loading";
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
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Save,
  Users,
  AlertTriangle,
  Loader2,
  BookOpen,
  Calendar,
  GraduationCap,
} from "lucide-react";

interface Student {
  id: string;
  name: string;
  matricule: string;
  photo_url: string | null;
  department?: {
    id: number;
    name: string;
  };
  class_students: Array<{
    level_id: number;
  }>;
}

interface DisciplineRecord {
  id?: string;
  student_id: string;
  term_id: string;
  academic_year_id: string;
  level_id: number;
  unjustified_absences: number;
  justified_absences: number;
  lateness: number;
  punishment_hours: number;
  conduct: string;
  warnings: number;
  reprimands: number;
  suspensions: number;
}

interface AcademicYear {
  id: string;
  label: string;
  is_active: boolean;
}

interface Term {
  id: string;
  label: string;
  is_active: boolean;
}

interface Level {
  id: number;
  name: string;
}

function toTitleCase(value: string): string {
  if (!value) return "";

  return value
    .split(/(\([^)]*\))/g) // split but keep bracketed parts
    .map(part => {
      // If part is inside brackets, return as-is
      if (part.startsWith("(") && part.endsWith(")")) {
        return part;
      }

      // Title-case only non-bracket text
      return part
        .toLowerCase()
        .replace(/\b\w/g, char => char.toUpperCase());
    })
    .join("");
}

const Discipline = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);

  // Filter states
  const [selectedAcademicYear, setSelectedAcademicYear] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("1");
  const [departmentFilter, setDepartmentFilter] = useState("all");

  // Data states
  const [students, setStudents] = useState<Student[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [disciplineRecords, setDisciplineRecords] = useState<{
    [key: string]: DisciplineRecord;
  }>({});

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedAcademicYear && selectedTerm && selectedLevel) {
      fetchStudents();
    }
  }, [selectedAcademicYear, selectedTerm, selectedLevel]);

  useEffect(() => {
    if (selectedAcademicYear && selectedTerm && selectedLevel) {
      fetchDisciplineRecords();
    }
  }, [selectedAcademicYear, selectedTerm, selectedLevel]);

  useEffect(() => {
    if (
      students.length > 0 &&
      selectedAcademicYear &&
      selectedTerm &&
      selectedLevel
    ) {
      initializeDisciplineRecords();
    }
  }, [students, selectedAcademicYear, selectedTerm, selectedLevel]);

  const fetchInitialData = async () => {
    try {
      const [
        academicYearsResponse,
        termsResponse,
        levelsResponse,
        departmentsResponse,
      ] = await Promise.all([
        supabase
          .from("academic_years")
          .select("id, label, is_active")
          .order("start_date", { ascending: false }),
        supabase
          .from("terms")
          .select("id, label, is_active")
          .order("start_date"),
        supabase.from("levels").select("id, name").order("name"),
        supabase.from("departments").select("id, name").order("name"),
      ]);

      if (academicYearsResponse.error) throw academicYearsResponse.error;
      if (termsResponse.error) throw termsResponse.error;
      if (levelsResponse.error) throw levelsResponse.error;
      if (departmentsResponse.error) throw departmentsResponse.error;

      setAcademicYears(academicYearsResponse.data || []);
      setTerms(termsResponse.data || []);
      setLevels(levelsResponse.data || []);
      setDepartments(departmentsResponse.data || []);

      // Set default values
      const activeAcademicYear = academicYearsResponse.data?.find(
        (year) => year.is_active
      );
      const activeTerm = termsResponse.data?.find((term) => term.is_active);

      if (activeAcademicYear) setSelectedAcademicYear(activeAcademicYear.id);
      if (activeTerm) setSelectedTerm(activeTerm.id);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      // Add 2 second delay before turning off loading
    }
  };

  const fetchStudents = async () => {
    if (!selectedAcademicYear || !selectedLevel) return;

    try {
      setLoadingStudents(true);
      const { data, error } = await supabase
        .from("class_students")
        .select(
          `
          students!inner (
            id, name, matricule, photo_url,
            departments (
              id, name
            )
          ),
          level_id
        `
        )
        .eq("academic_year_id", selectedAcademicYear)
        .eq("level_id", parseInt(selectedLevel));

      if (error) throw error;

      const studentsData =
        data?.map((cs) => ({
          id: cs.students.id,
          name: cs.students.name,
          matricule: cs.students.matricule,
          photo_url: cs.students.photo_url,
          department: cs.students.departments,
          class_students: [{ level_id: cs.level_id }],
        })) || [];

      setStudents(studentsData);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error fetching students",
        description: error.message,
      });
    } finally {
      setLoadingStudents(false);
    }
  };

  const fetchDisciplineRecords = async () => {
    if (!selectedAcademicYear || !selectedTerm || !selectedLevel) return;

    try {
      const { data, error } = await supabase
        .from("discipline_records")
        .select("*")
        .eq("academic_year_id", selectedAcademicYear)
        .eq("term_id", selectedTerm)
        .eq("level_id", selectedLevel);

      if (error) throw error;

      const recordsMap: { [key: string]: DisciplineRecord } = {};
      data?.forEach((record) => {
        recordsMap[record.student_id] = {
          id: record.id,
          student_id: record.student_id,
          term_id: record.term_id,
          academic_year_id: record.academic_year_id,
          level_id: record.level_id,
          unjustified_absences: record.unjustified_absences || 0,
          justified_absences: record.justified_absences || 0,
          lateness: record.lateness || 0,
          punishment_hours: record.punishment_hours || 0,
          conduct: record.conduct || "Excellent",
          warnings: Array.isArray(record.warnings) ? record.warnings.length : 0,
          reprimands: record.reprimands || 0,
          suspensions: record.suspensions || 0,
        };
      });

      setDisciplineRecords(recordsMap);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error fetching discipline records",
        description: error.message,
      });
    } finally {
      setTimeout(() => {
        setLoading(false);
      }, 500);
    }
  };

  // Initialize discipline records for all students with default values
  const initializeDisciplineRecords = () => {
    if (!selectedAcademicYear || !selectedTerm || !selectedLevel) return;

    const initialRecords: { [key: string]: DisciplineRecord } = {};
    students.forEach((student) => {
      // Only create initial record if one doesn't exist
      if (!disciplineRecords[student.id]) {
        initialRecords[student.id] = {
          student_id: student.id,
          term_id: selectedTerm,
          academic_year_id: selectedAcademicYear,
          level_id: parseInt(selectedLevel),
          unjustified_absences: 0,
          justified_absences: 0,
          lateness: 0,
          punishment_hours: 0,
          conduct: "Excellent",
          warnings: 0,
          reprimands: 0,
          suspensions: 0,
        };
      }
    });

    if (Object.keys(initialRecords).length > 0) {
      setDisciplineRecords((prev) => ({
        ...prev,
        ...initialRecords,
      }));
    }
  };

  const updateDisciplineRecord = (
    studentId: string,
    field: keyof DisciplineRecord,
    value: string | number
  ) => {
    setDisciplineRecords((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value,
      },
    }));
  };


  const saveDisciplineRecords = async () => {
    setSaving(true);
    try {
      // Ensure all students have records before saving
      const allRecords = { ...disciplineRecords };

      // Add missing records for students who don't have any
      students.forEach((student) => {
        if (!allRecords[student.id]) {
          allRecords[student.id] = {
            student_id: student.id,
            term_id: selectedTerm,
            academic_year_id: selectedAcademicYear,
            level_id: parseInt(selectedLevel),
            unjustified_absences: 0,
            justified_absences: 0,
            lateness: 0,
            punishment_hours: 0,
            conduct: "Excellent",
            warnings: 0,
            reprimands: 0,
            suspensions: 0,
          };
        }
      });

      // Process each record individually
      for (const record of Object.values(allRecords)) {
        const recordData = {
          student_id: record.student_id,
          term_id: record.term_id,
          academic_year_id: record.academic_year_id,
          level_id: record.level_id,
          unjustified_absences: record.unjustified_absences,
          justified_absences: record.justified_absences,
          lateness: record.lateness,
          punishment_hours: record.punishment_hours,
          conduct: record.conduct,
          warnings: Array(record.warnings || 0).fill("Warning"), // Convert number to array
          reprimands: record.reprimands,
          suspensions: record.suspensions,
        };

        // Check if record exists
        const { data: existingRecord } = await supabase
          .from("discipline_records")
          .select("id")
          .eq("student_id", record.student_id)
          .eq("term_id", record.term_id)
          .eq("academic_year_id", record.academic_year_id)
          .eq("level_id", record.level_id)
          .single();

        if (existingRecord) {
          // Update existing record
          const { error } = await supabase
            .from("discipline_records")
            .update(recordData)
            .eq("id", existingRecord.id);

          if (error) throw error;
        } else {
          // Insert new record
          const { error } = await supabase
            .from("discipline_records")
            .insert([recordData]);

          if (error) throw error;
        }
      }

      toast({
        title: "Success",
        description: "Discipline records saved successfully",
      });

      // Refresh the records immediately
      await fetchDisciplineRecords();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error saving records",
        description: error.message,
      });
    } finally {
      setSaving(false);
    }
  };


  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase();
  };

  // Filter students based on department filter
  const filteredStudents =
    departmentFilter && departmentFilter !== "all"
      ? students.filter(
          (student) => student.department?.id.toString() === departmentFilter
        )
      : students;

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="space-y-2">
          <div className="h-8 w-32 bg-muted-foreground/5 animate-pulse rounded-md" />
          <div className="h-4 w-96 bg-muted-foreground/5 animate-pulse rounded-md" />
        </div>

        {/* Filters Skeleton */}
        <Card className="text-muted-foreground shadow-none pt-4 border-0 bg-muted-foreground/[0.01]">
          <CardContent className="space-y-4">
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

        {/* Table Skeleton - Simplified */}
        <Card className="shadow-none border-0 bg-muted-foreground/[0.01]">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div className="h-10 w-48 bg-muted-foreground/5 animate-pulse rounded-md" />
              <div className="h-10 w-40 bg-muted-foreground/5 animate-pulse rounded-md" />
            </div>

            <div className="space-y-3">
              {/* Table Header */}
              <div className="flex items-center gap-3 pb-3 border-b">
                <div className="h-4 flex-1 bg-muted-foreground/5 animate-pulse rounded-md" />
                <div className="h-4 w-16 bg-muted-foreground/5 animate-pulse rounded-md" />
                <div className="h-4 w-16 bg-muted-foreground/5 animate-pulse rounded-md" />
                <div className="h-4 w-16 bg-muted-foreground/5 animate-pulse rounded-md" />
                <div className="h-4 w-20 bg-muted-foreground/5 animate-pulse rounded-md" />
                <div className="h-4 w-16 bg-muted-foreground/5 animate-pulse rounded-md" />
                <div className="h-4 w-16 bg-muted-foreground/5 animate-pulse rounded-md" />
                <div className="h-4 w-16 bg-muted-foreground/5 animate-pulse rounded-md" />
                <div className="h-4 w-16 bg-muted-foreground/5 animate-pulse rounded-md" />
              </div>

              {/* Table Rows */}
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-3">
                  <div className="h-4 flex-1 bg-muted-foreground/5 animate-pulse rounded-md" />
                  <div className="h-4 w-16 bg-muted-foreground/5 animate-pulse rounded-md" />
                  <div className="h-4 w-16 bg-muted-foreground/5 animate-pulse rounded-md" />
                  <div className="h-4 w-16 bg-muted-foreground/5 animate-pulse rounded-md" />
                  <div className="h-4 w-20 bg-muted-foreground/5 animate-pulse rounded-md" />
                  <div className="h-4 w-16 bg-muted-foreground/5 animate-pulse rounded-md" />
                  <div className="h-4 w-16 bg-muted-foreground/5 animate-pulse rounded-md" />
                  <div className="h-4 w-16 bg-muted-foreground/5 animate-pulse rounded-md" />
                  <div className="h-4 w-16 bg-muted-foreground/5 animate-pulse rounded-md" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-muted-foreground/85">
          Discipline
        </h1>
        <p className="text-md mt-1 text-muted-foreground/80">
          Manage discipline information for students
        </p>
      </div>

      {/* Filters */}
      <Card className="text-muted-foreground/85 shadow-none pt-4">
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="academic-year">Academic Year</Label>
              <Select
                value={selectedAcademicYear}
                onValueChange={setSelectedAcademicYear}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Academic Year" />
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
                  <SelectValue placeholder="Select Term" />
                </SelectTrigger>
                <SelectContent>
                  {terms.map((term) => (
                    <SelectItem key={term.id} value={term.id}>
                      {toTitleCase(term.label)}
                      {term.is_active ? " (current)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="level">Level</Label>
              <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Level" />
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
        </CardContent>
      </Card>

      {/* Empty States */}
      {students.length < 1 && !loading ? (
        <Card className="shadow-none border-0 collapsible-content" data-state="open">
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
                  {`No students enrolled in level ${selectedLevel} for the ${
                    academicYears.find(
                      (year) => year.id === selectedAcademicYear
                    )?.label || "selected"
                  } academic year. Add students to level ${selectedLevel} and their discipline records will be displayed.`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-none pt-6 border-none">
          <CardContent className="p-0">
            <div className="flex justify-between items-end mb-6 min-h-[2.5rem] px-2">
              <div className="flex items-center gap-4">
                <Label
                  htmlFor="department-filter"
                  className="text-sm font-medium text-muted-foreground/85"
                >
                  Filter by Department:
                </Label>
                <Select
                  value={departmentFilter}
                  onValueChange={setDepartmentFilter}
                >
                  <SelectTrigger className="w-[200px] text-muted-foreground/80">
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id.toString()}>
                        {toTitleCase(dept.name)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={saveDisciplineRecords}
                disabled={saving}
                className="min-w-[140px]"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving Records...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save All Records
                  </>
                )}
              </Button>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 text-muted-foreground/80">
                    <TableHead className="font-medium rounded-tl-md rounded-bl-md">
                      Student
                    </TableHead>
                    <TableHead className="font-medium text-center">
                      Unjust. Abs.
                    </TableHead>
                    <TableHead className="font-medium text-center">
                      Just. Abs.
                    </TableHead>
                    <TableHead className="font-medium text-center">
                      Late(times)
                    </TableHead>
                    <TableHead className="font-medium text-center">
                      Punishment(hrs)
                    </TableHead>
                    <TableHead className="font-medium text-center">
                      Conduct
                    </TableHead>
                    <TableHead className="font-medium text-center">
                      Warnings
                    </TableHead>
                    <TableHead className="font-medium text-center">
                      Reprimands
                    </TableHead>
                    <TableHead className="font-medium text-center rounded-tr-md rounded-br-md">
                      Suspensions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingStudents ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="animate-spin h-4 w-4 text-muted-foreground/80" />
                          <span className="text-muted-foreground/80">
                            Loading students...
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStudents.map((student) => {
                      const record = disciplineRecords[student.id] || {};
                      return (
                        <TableRow
                          key={student.id}
                          className="hover:bg-muted/30 rounded-md"
                        >
                          <TableCell>
                            <div className="text-xs text-muted-foreground/80 font-medium max-w-[150px] overflow-hidden text-ellipsis">
                              {student.name}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Input
                              type="number"
                              min="0"
                              value={
                                typeof record.unjustified_absences === "number"
                                  ? record.unjustified_absences === 0
                                    ? "0"
                                    : record.unjustified_absences.toString()
                                  : record.unjustified_absences || ""
                              }
                              onChange={(e) => {
                                updateDisciplineRecord(
                                  student.id,
                                  "unjustified_absences",
                                  e.target.value === "" ? "" : e.target.value.replace(/[^0-9]/g, "")
                                );
                              }}
                              onBlur={(e) => {
                                const val = e.target.value;
                                const num = parseInt(val, 10);
                                updateDisciplineRecord(
                                  student.id,
                                  "unjustified_absences",
                                  val === "" || isNaN(num) || num < 0 ? 0 : num
                                );
                              }}
                              className="w-12 text-center m-auto"
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Input
                              type="number"
                              min="0"
                              value={
                                typeof record.justified_absences === "number"
                                  ? record.justified_absences === 0
                                    ? "0"
                                    : record.justified_absences.toString()
                                  : record.justified_absences || ""
                              }
                              onChange={(e) => {
                                updateDisciplineRecord(
                                  student.id,
                                  "justified_absences",
                                  e.target.value === "" ? "" : e.target.value.replace(/[^0-9]/g, "")
                                );
                              }}
                              onBlur={(e) => {
                                const val = e.target.value;
                                const num = parseInt(val, 10);
                                updateDisciplineRecord(
                                  student.id,
                                  "justified_absences",
                                  val === "" || isNaN(num) || num < 0 ? 0 : num
                                );
                              }}
                              className="w-12 text-center m-auto"
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Input
                              type="number"
                              min="0"
                              value={
                                typeof record.lateness === "number"
                                  ? record.lateness === 0
                                    ? "0"
                                    : record.lateness.toString()
                                  : record.lateness || ""
                              }
                              onChange={(e) => {
                                updateDisciplineRecord(
                                  student.id,
                                  "lateness",
                                  e.target.value === "" ? "" : e.target.value.replace(/[^0-9]/g, "")
                                );
                              }}
                              onBlur={(e) => {
                                const val = e.target.value;
                                const num = parseInt(val, 10);
                                updateDisciplineRecord(
                                  student.id,
                                  "lateness",
                                  val === "" || isNaN(num) || num < 0 ? 0 : num
                                );
                              }}
                              className="w-12 text-center m-auto"
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Input
                              type="number"
                              min="0"
                              value={
                                typeof record.punishment_hours === "number"
                                  ? record.punishment_hours === 0
                                    ? "0"
                                    : record.punishment_hours.toString()
                                  : record.punishment_hours || ""
                              }
                              onChange={(e) => {
                                updateDisciplineRecord(
                                  student.id,
                                  "punishment_hours",
                                  e.target.value === "" ? "" : e.target.value.replace(/[^0-9]/g, "")
                                );
                              }}
                              onBlur={(e) => {
                                const val = e.target.value;
                                const num = parseInt(val, 10);
                                updateDisciplineRecord(
                                  student.id,
                                  "punishment_hours",
                                  val === "" || isNaN(num) || num < 0 ? 0 : num
                                );
                              }}
                              className="w-12 text-center m-auto"
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Select
                              value={record.conduct || "Excellent"}
                              onValueChange={(value) =>
                                updateDisciplineRecord(
                                  student.id,
                                  "conduct",
                                  value
                                )
                              }
                            >
                              <SelectTrigger className="w-25 text-xs font-medium m-auto">
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Excellent">
                                  {toTitleCase("Excellent")}
                                </SelectItem>
                                <SelectItem value="Good">{toTitleCase("Good")}</SelectItem>
                                <SelectItem value="Fair">{toTitleCase("Fair")}</SelectItem>
                                <SelectItem value="Poor">{toTitleCase("Poor")}</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-center">
                            <Input
                              type="number"
                              min="0"
                              value={
                                typeof record.warnings === "number"
                                  ? record.warnings === 0
                                    ? "0"
                                    : record.warnings.toString()
                                  : record.warnings || ""
                              }
                              onChange={(e) => {
                                updateDisciplineRecord(
                                  student.id,
                                  "warnings",
                                  e.target.value === "" ? "" : e.target.value.replace(/[^0-9]/g, "")
                                );
                              }}
                              onBlur={(e) => {
                                const val = e.target.value;
                                const num = parseInt(val, 10);
                                updateDisciplineRecord(
                                  student.id,
                                  "warnings",
                                  val === "" || isNaN(num) || num < 0 ? 0 : num
                                );
                              }}
                              className="w-12 text-center m-auto"
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Input
                              type="number"
                              min="0"
                              value={
                                typeof record.reprimands === "number"
                                  ? record.reprimands === 0
                                    ? "0"
                                    : record.reprimands.toString()
                                  : record.reprimands || ""
                              }
                              onChange={(e) => {
                                updateDisciplineRecord(
                                  student.id,
                                  "reprimands",
                                  e.target.value === "" ? "" : e.target.value.replace(/[^0-9]/g, "")
                                );
                              }}
                              onBlur={(e) => {
                                const val = e.target.value;
                                const num = parseInt(val, 10);
                                updateDisciplineRecord(
                                  student.id,
                                  "reprimands",
                                  val === "" || isNaN(num) || num < 0 ? 0 : num
                                );
                              }}
                              className="w-12 text-center m-auto"
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Input
                              type="number"
                              min="0"
                              value={
                                typeof record.suspensions === "number"
                                  ? record.suspensions === 0
                                    ? "0"
                                    : record.suspensions.toString()
                                  : record.suspensions || ""
                              }
                              onChange={(e) => {
                                updateDisciplineRecord(
                                  student.id,
                                  "suspensions",
                                  e.target.value === "" ? "" : e.target.value.replace(/[^0-9]/g, "")
                                );
                              }}
                              onBlur={(e) => {
                                const val = e.target.value;
                                const num = parseInt(val, 10);
                                updateDisciplineRecord(
                                  student.id,
                                  "suspensions",
                                  val === "" || isNaN(num) || num < 0 ? 0 : num
                                );
                              }}
                              className="w-12 text-center m-auto"
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })
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

export default Discipline;
