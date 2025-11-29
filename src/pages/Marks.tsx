import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Save,
  Filter,
  Users,
  ClipboardList,
  Calendar,
  Loader2,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { evaluateScores } from "@/lib/marks";
import { Loading } from "@/components/ui/loading";

// Interfaces
interface Mark {
  id: string;
  student_id: string;
  course_id: string;
  term_id: string;
  academic_year_id: string;
  ca_score: number;
  exam_score: number;
  created_at: string;
}

interface Student {
  id: string;
  name: string;
  department_id: string;
}

interface Course {
  id: string;
  name: string;
  code: string;
  level_id: number;
  department_id: string;
  coefficient: number;
}

interface Term {
  id: string;
  label: string;
  is_active: boolean;
  academic_year_id: string;
}

interface AcademicYear {
  id: string;
  label: string;
  is_active: boolean;
}

interface Lecturer {
  id: string;
  full_name: string;
  course_id: string;
}

interface EditingCell {
  studentId: string;
  field: "ca_score" | "exam_score";
}

interface StudentMark {
  student_id: string;
  student_name: string;
  ca_score: number | null;
  exam_score: number | null;
  mark_id?: string;
}

const Marks = () => {
  const { userRole, user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [studentMarks, setStudentMarks] = useState<StudentMark[]>([]);

  // Filters
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("");
  const [selectedAcademicYear, setSelectedAcademicYear] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [editValue, setEditValue] = useState("");

  // Search and sort states
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    fetchInitialData();
  }, [userRole, user]);

  useEffect(() => {
    if (selectedCourse && selectedTerm) {
      fetchStudentsForCourse();
    }
  }, [selectedCourse, selectedTerm]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);

      // Get academic years
      const { data: academicYearsData, error: ayError } = await supabase
        .from("academic_years")
        .select("*")
        .order("is_active", { ascending: false });
      if (ayError) throw ayError;

      // Get active academic year
      const activeYear =
        academicYearsData?.find((ay) => ay.is_active) || academicYearsData?.[0];

      console.log("Academic years data:", academicYearsData);
      console.log("Active year:", activeYear);

      if (activeYear) {
        setSelectedAcademicYear(activeYear.id);
      }

      // Get all terms (since some may not have academic_year_id properly set)
      const { data: termsData, error: termsError } = await supabase
        .from("terms")
        .select("*")
        .order("is_active", { ascending: false });

      console.log("Terms data:", termsData);
      console.log("Terms error:", termsError);

      if (termsError) throw termsError;

      // Get active term
      const activeTerm = termsData?.find((t) => t.is_active) || termsData?.[0];
      console.log("Active term:", activeTerm);

      if (activeTerm) {
        setSelectedTerm(activeTerm.id);
      }

      setTerms(termsData || []);

      setAcademicYears(academicYearsData || []);

      // Get courses and lecturers
      let coursesQuery = supabase.from("courses").select("*").order("name");
      let lecturersQuery = supabase.from("lecturers").select("*");

      if (userRole === "lecturer" && user) {
        lecturersQuery = lecturersQuery.eq("user_id", user.id);
      }

      const [coursesResponse, lecturersResponse] = await Promise.all([
        coursesQuery,
        lecturersQuery,
      ]);

      if (coursesResponse.error) throw coursesResponse.error;
      if (lecturersResponse.error) throw lecturersResponse.error;

      const coursesData = coursesResponse.data || [];
      const lecturersData = lecturersResponse.data || [];

      setCourses(coursesData);
      setLecturers(lecturersData);

      // For lecturers, auto-select their course if they have only one
      if (userRole === "lecturer" && lecturersData.length === 1) {
        const lecturerCourse = coursesData.find(
          (c) => c.id === lecturersData[0].course_id
        );
        if (lecturerCourse) {
          setSelectedCourse(lecturerCourse.id);
        }
      }
    } catch (error: any) {
      toast.error("Error loading data: " + error.message);
    } finally {
      setTimeout(() => {
        setLoading(false);
      }, 500);
    }
  };

  const fetchStudentsForCourse = async () => {
    if (!selectedCourse || !selectedTerm || !selectedAcademicYear) return;

    try {
      setLoadingStudents(true);

      console.log("Calling get-student-marks function with:", {
        courseId: selectedCourse,
        termId: selectedTerm,
        academicYearId: selectedAcademicYear,
      });

      const { data, error } = await supabase.functions.invoke(
        "get-student-marks",
        {
          body: {
            courseId: selectedCourse,
            termId: selectedTerm,
            academicYearId: selectedAcademicYear,
          },
        }
      );

      if (error) {
        console.error("Edge function error:", error);
        toast.error("Failed to connect to server. Please try again.");
        return;
      }

      if (!data?.success) {
        console.error("Edge function returned error:", data?.error);
        toast.error(data?.error || "Failed to fetch student marks");
        return;
      }

      console.log("Edge function response:", data);
      setStudentMarks(data.data || []);
    } catch (error: any) {
      console.error("Error in fetchStudentsForCourse:", error);
      toast.error(
        "Error loading students: " + (error.message || "Unknown error")
      );
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleAcademicYearChange = async (academicYearId: string) => {
    setSelectedAcademicYear(academicYearId);
    setSelectedTerm("");

    console.log("Academic year changed to:", academicYearId);

    try {
      const { data: termsData, error } = await supabase
        .from("terms")
        .select("*")
        .eq("academic_year_id", academicYearId)
        .order("is_active", { ascending: false });

      console.log("Terms data for academic year change:", termsData);
      console.log("Terms error for academic year change:", error);

      if (error) throw error;
      setTerms(termsData || []);

      // Auto-select active term if available, otherwise select first term
      const activeTerm = termsData?.find((t) => t.is_active) || termsData?.[0];
      if (activeTerm) {
        setSelectedTerm(activeTerm.id);
      }
    } catch (error: any) {
      console.error("Error in handleAcademicYearChange:", error);
      toast.error("Error loading terms: " + error.message);
    }
  };

  // Helper function to get evaluated scores for display
  const getEvaluatedScores = (studentMark: StudentMark) => {
    if (!selectedCourseData)
      return { average: null, weighted: null, grade: null, remark: null };

    return evaluateScores(
      studentMark.ca_score,
      studentMark.exam_score,
      selectedCourseData.coefficient
    );
  };

  const handleCellEdit = (
    studentId: string,
    field: "ca_score" | "exam_score"
  ) => {
    // Prevent editing if lecturer and not active academic year/term
    if (userRole === "lecturer") {
      const selectedYear = academicYears.find(y => y.id === selectedAcademicYear);
      const selectedTermData = terms.find(t => t.id === selectedTerm);
      
      if (!selectedYear?.is_active || !selectedTermData?.is_active) {
        toast.error("You can only edit marks for the current active academic year and term.");
        return;
      }
    }

    const student = studentMarks.find((s) => s.student_id === studentId);
    if (!student) return;

    setEditingCell({ studentId, field });
    setEditValue(student[field].toString() || "-");
  };

  const handleCellSave = async () => {
    if (!editingCell) return;

    // Double-check restriction for lecturers before saving
    if (userRole === "lecturer") {
      const selectedYear = academicYears.find(y => y.id === selectedAcademicYear);
      const selectedTermData = terms.find(t => t.id === selectedTerm);
      
      if (!selectedYear?.is_active || !selectedTermData?.is_active) {
        toast.error("You can only edit marks for the current active academic year and term.");
        setEditingCell(null);
        setEditValue("");
        return;
      }
    }

    const score = parseFloat(editValue);

    // Validate input
    if (isNaN(score)) {
      toast.error("Please enter a valid number");
      return;
    }

    if (score < 0 || score > 20) {
      toast.error("Score must be between 0 and 20");
      return;
    }

    try {
      setSaving(true);

      // Show loading toast
      const loadingToast = toast.loading("Saving mark...");

      const studentMark = studentMarks.find(
        (s) => s.student_id === editingCell.studentId
      );
      if (!studentMark) {
        toast.dismiss(loadingToast);
        toast.error("Student not found");
        return;
      }

      const updatedMark = { ...studentMark };
      updatedMark[editingCell.field] = score;

      const caScore =
        editingCell.field === "ca_score" ? score : updatedMark.ca_score || 0;
      const examScore =
        editingCell.field === "exam_score"
          ? score
          : updatedMark.exam_score || 0;

      const markData = {
        student_id: editingCell.studentId,
        course_id: selectedCourse,
        term_id: selectedTerm,
        academic_year_id: selectedAcademicYear,
        ca_score: caScore,
        exam_score: examScore,
      };

      const { data, error } = await supabase
        .from("marks")
        .upsert(markData, {
          onConflict: "student_id,course_id,term_id",
        })
        .select()
        .single();

      // Dismiss loading toast
      toast.dismiss(loadingToast);

      if (error) {
        console.error("Database error:", error);

        // Handle specific error cases
        if (error.code === "PGRST204") {
          toast.error("Database schema error. Please contact administrator.");
        } else if (error.code === "23503") {
          toast.error("Invalid data reference. Please check your selection.");
        } else if (error.code === "23514") {
          toast.error("Score validation failed. Please check the constraints.");
        } else {
          toast.error(`Failed to save mark: ${error.message}`);
        }
        return;
      }

      if (!data) {
        toast.error("No data returned from save operation");
        return;
      }

      updatedMark.mark_id = data.id;

      // Update local state
      setStudentMarks((prev) =>
        prev.map((s) =>
          s.student_id === editingCell.studentId ? updatedMark : s
        )
      );

      // Show success message with details
      const fieldName = editingCell.field === "ca_score" ? "CA" : "Exam";
      toast.success(
        `${fieldName} score (${score}) saved successfully for ${studentMark.student_name}`
      );

      setEditingCell(null);
      setEditValue("");
    } catch (error: any) {
      console.error("Unexpected error saving mark:", error);

      // Handle network and other unexpected errors
      if (error.name === "NetworkError" || error.message?.includes("fetch")) {
        toast.error(
          "Network error. Please check your connection and try again."
        );
      } else {
        toast.error(
          `Unexpected error: ${error.message || "Unknown error occurred"}`
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCellCancel = () => {
    setEditingCell(null);
    setEditValue("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleCellSave();
    } else if (e.key === "Escape") {
      handleCellCancel();
    }
  };

  // Filter and sort students
  const filteredAndSortedStudents = React.useMemo(() => {
    let filtered = studentMarks;

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter((student) =>
        student.student_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply sorting
    return filtered.sort((a, b) => {
      const nameA = a.student_name.toLowerCase();
      const nameB = b.student_name.toLowerCase();

      if (sortOrder === "asc") {
        return nameA.localeCompare(nameB);
      } else {
        return nameB.localeCompare(nameA);
      }
    });
  }, [studentMarks, searchQuery, sortOrder]);

  // Filter courses for lecturers
  const availableCourses =
    userRole === "lecturer"
      ? courses.filter((course) =>
          lecturers.some((l) => l.course_id === course.id)
        )
      : courses;

  const selectedCourseData = courses.find((c) => c.id === selectedCourse);

  // Check if current selection is active (for lecturers)
  const isActiveSelection = React.useMemo(() => {
    if (userRole !== "lecturer") return true;
    
    const selectedYear = academicYears.find(y => y.id === selectedAcademicYear);
    const selectedTermData = terms.find(t => t.id === selectedTerm);
    
    return selectedYear?.is_active && selectedTermData?.is_active;
  }, [userRole, academicYears, selectedAcademicYear, terms, selectedTerm]);

  if (loading) {
    return (
      <div className="p-4 space-y-6">
        {/* Page Header Skeleton */}
        <div className="space-y-2">
          <div className="h-8 w-40 bg-muted-foreground/5 animate-pulse rounded-md" />
          <div className="h-4 w-56 bg-muted-foreground/5 animate-pulse rounded-md" />
        </div>

        {/* Filters Skeleton */}
        <Card className="text-muted-foreground shadow-none pt-6 border-0 bg-muted-foreground/[0.01]">
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
          <CardHeader>
            <div className="h-6 w-48 bg-muted-foreground/5 animate-pulse rounded-md" />
            <div className="h-4 w-64 bg-muted-foreground/5 animate-pulse rounded-md mt-2" />
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-6">
              <div className="h-10 flex-1 rounded-md bg-muted-foreground/5 animate-pulse" />
              <div className="h-10 w-24 rounded-md bg-muted-foreground/5 animate-pulse" />
            </div>

            <div className="space-y-3">
              {/* Table Header */}
              <div className="flex items-center gap-4 pb-3 border-b">
                <div className="h-4 flex-1 bg-muted-foreground/5 animate-pulse rounded-md" />
                <div className="h-4 w-16 bg-muted-foreground/5 animate-pulse rounded-md" />
                <div className="h-4 w-16 bg-muted-foreground/5 animate-pulse rounded-md" />
                <div className="h-4 w-20 bg-muted-foreground/5 animate-pulse rounded-md" />
                <div className="h-4 w-20 bg-muted-foreground/5 animate-pulse rounded-md" />
                <div className="h-4 w-16 bg-muted-foreground/5 animate-pulse rounded-md" />
              </div>

              {/* Table Rows */}
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 py-3">
                  <div className="h-4 flex-1 bg-muted-foreground/5 animate-pulse rounded-md" />
                  <div className="h-4 w-16 bg-muted-foreground/5 animate-pulse rounded-md" />
                  <div className="h-4 w-16 bg-muted-foreground/5 animate-pulse rounded-md" />
                  <div className="h-4 w-20 bg-muted-foreground/5 animate-pulse rounded-md" />
                  <div className="h-4 w-20 bg-muted-foreground/5 animate-pulse rounded-md" />
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
    <div className="p-4 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-muted-foreground/85">
          Student Marks
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground/80">
          Manage student's marks
        </p>
      </div>

      {/* Filters */}
      <Card className="text-muted-foreground shadow-[0] pt-6">
        <CardContent className="space-y-4 text-muted-foreground/85">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Academic Year</Label>
              <Select
                value={selectedAcademicYear}
                onValueChange={handleAcademicYearChange}
                disabled={userRole === "lecturer"}
              >
                <SelectTrigger className={userRole === "lecturer" ? "opacity-70 cursor-not-allowed" : ""}>
                  <SelectValue placeholder="Select academic year" />
                </SelectTrigger>
                <SelectContent>
                  {academicYears.map((year) => (
                    <SelectItem key={year.id} value={year.id}>
                      {year.label} {year.is_active && "(Current)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Term</Label>
              <Select 
                value={selectedTerm} 
                onValueChange={setSelectedTerm}
                disabled={userRole === "lecturer"}
              >
                <SelectTrigger className={userRole === "lecturer" ? "opacity-95 cursor-not-allowed" : ""}>
                  <SelectValue placeholder="Select term" />
                </SelectTrigger>
                <SelectContent>
                  {terms.length === 0 && (
                    <SelectItem value="no-terms" disabled>
                      No terms available
                    </SelectItem>
                  )}
                  {terms.map((term) => (
                    <SelectItem key={term.id} value={term.id}>
                      {term.label} {term.is_active && "(Current)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Course</Label>
              <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                <SelectTrigger>
                  <SelectValue placeholder="Select course" />
                </SelectTrigger>
                <SelectContent>
                  {availableCourses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedCourseData && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground collapsible-content" data-state="open">
              <Badge
                variant="secondary"
                className="bg-muted hover:bg-accent/30"
              >
                Level {selectedCourseData.level_id}
              </Badge>
              <Badge
                variant="outline"
                className="bg-muted hover:bg-accent/30 border-0"
              >
                Coef {selectedCourseData.coefficient}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Excel-like Marks Table */}
      {selectedCourse && selectedTerm && (
        <Card className="shadow-[0] collapsible-content" data-state="open">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg text-muted-foreground/85">
                  {selectedCourseData?.name}
                </CardTitle>
                <CardDescription className="text-muted-foreground/80">
                  Click on marks value to edit. Press Enter to save, Escape to
                  cancel.
                </CardDescription>
              </div>
              {userRole === "lecturer" && !isActiveSelection && (
                <Badge variant="destructive" className="ml-4">
                  View Only - Not Current Period
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between pb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground/70 h-4 w-4" />
                <Input
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 search-input"
                />
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                  }
                  className="flex items-center gap-2 bg-muted hover:bg-accent/30 text-muted-foreground/85"
                >
                  <ArrowUpDown className="h-4 w-4" />
                  {sortOrder === "asc" ? "A-Z" : "Z-A"}
                </Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 text-muted-foreground/85">
                    <TableHead className="font-medium rounded-tl-md rounded-bl-md">
                      Student Name
                    </TableHead>
                    <TableHead className="font-medium text-center">
                      Test (/20)
                    </TableHead>
                    <TableHead className="font-medium text-center">
                      Exam (/20)
                    </TableHead>
                    <TableHead className="font-medium text-center">
                      Avg Marks(/20)
                    </TableHead>
                    <TableHead className="font-medium text-center">
                      {`Avg * Coef (/${20 * selectedCourseData.coefficient})`}
                    </TableHead>
                    <TableHead className="font-medium text-center rounded-tr-md rounded-br-md">
                      Grade
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingStudents ? (
                    <TableRow className="text-muted-foreground/80">
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
                    filteredAndSortedStudents.map((studentMark) => (
                      <TableRow
                        key={studentMark.student_id}
                        className="hover:bg-muted/30"
                      >
                        <TableCell className="text-muted-foreground">
                          {studentMark.student_name}
                        </TableCell>

                        {/* CA Score Cell */}
                        <TableCell className="text-center">
                          {editingCell?.studentId === studentMark.student_id &&
                          editingCell?.field === "ca_score" ? (
                            <Input
                              type="number"
                              min="0"
                              max="20"
                              step="0.5"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={handleKeyPress}
                              onBlur={handleCellSave}
                              className="w-20 h-8 text-center"
                              autoFocus
                            />
                          ) : (
                            <div
                              className={`w-20 h-8 flex items-center justify-center mx-auto text-muted-foreground rounded px-2 ${
                                isActiveSelection || userRole === "admin"
                                  ? "cursor-pointer hover:background hover:border-[2px] hover:border-primary/80"
                                  : "cursor-not-allowed opacity-60"
                              }`}
                              onClick={() =>
                                (isActiveSelection || userRole === "admin") &&
                                handleCellEdit(
                                  studentMark.student_id,
                                  "ca_score"
                                )
                              }
                            >
                              {studentMark.ca_score || "-"}
                            </div>
                          )}
                        </TableCell>

                        {/* Exam Score Cell */}
                        <TableCell className="text-center">
                          {editingCell?.studentId === studentMark.student_id &&
                          editingCell?.field === "exam_score" ? (
                            <Input
                              type="number"
                              min="0"
                              max="20"
                              step="0.5"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={handleKeyPress}
                              onBlur={handleCellSave}
                              className="w-20 h-8 text-center"
                              autoFocus
                            />
                          ) : (
                            <div
                              className={`w-20 h-8 flex items-center justify-center mx-auto rounded px-2 text-muted-foreground ${
                                isActiveSelection || userRole === "admin"
                                  ? "cursor-pointer hover:border-[2px] hover:border-primary/80"
                                  : "cursor-not-allowed opacity-60"
                              }`}
                              onClick={() =>
                                (isActiveSelection || userRole === "admin") &&
                                handleCellEdit(
                                  studentMark.student_id,
                                  "exam_score"
                                )
                              }
                            >
                              {studentMark.exam_score || "-"}
                            </div>
                          )}
                        </TableCell>

                        {/* Average Score */}
                        <TableCell className="text-center font-semibold">
                          {(() => {
                            const { average } = getEvaluatedScores(studentMark);
                            return average !== null ? average.toFixed(2) : "-";
                          })()}
                        </TableCell>

                        {/* Weighted Score */}
                        <TableCell className="text-center font-semibold">
                          {(() => {
                            const { weighted } =
                              getEvaluatedScores(studentMark);
                            return weighted !== null
                              ? weighted.toFixed(2)
                              : "-";
                          })()}
                        </TableCell>

                        {/* Grade */}
                        <TableCell className="text-center">
                          {(() => {
                            const { grade } = getEvaluatedScores(studentMark);
                            return (
                              grade && (
                                <Badge
                                  variant={
                                    grade === "F" ? "destructive" : "default"
                                  }
                                  className={`font-bold ${
                                    grade === "F"
                                      ? "bg-destructive/5 text-destructive hover:bg-destructive/5"
                                      : "bg-primary/5 text-primary hover:bg-primary/5"
                                  }`}
                                >
                                  {grade}
                                </Badge>
                              )
                            );
                          })()}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {filteredAndSortedStudents.length === 0 && !loadingStudents && (
                <div className="text-center py-8 text-muted-foreground/80">
                  No students found for this course and academic year.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {(!selectedCourse || !selectedTerm) && (
        <Card className="shadow-[0]">
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="font-medium mb-2 text-muted-foreground/85">
                Select Course to Manage Marks
              </h3>
              <p className="text-sm text-muted-foreground/80">
                Choose a course from the filters above to view and edit student
                marks.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Marks;
