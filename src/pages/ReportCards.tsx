import { useState, useEffect, useRef } from "react";
import ReactDOMServer from "react-dom/server";
import LottieAnimation from "@/components/ui/lottie-animation";
import animationData from "@/components/animations/empty box3.json";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import * as ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  Download,
  Search,
  Loader2,
  Printer,
  Eye,
  Users,
  FileDown,
  FileSpreadsheet,
  Calendar,
  BookOpen,
  GraduationCap,
  Building2,
  AlertCircle,
} from "lucide-react";
import ReportCardTemplate from "@/components/ReportCardTemplate";
import { Loading } from "@/components/ui/loading";

// Function to format position as ordinal number with superscript
const formatOrdinalPosition = (position: number): JSX.Element => {
  const getOrdinalSuffix = (num: number): string => {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) return "st";
    if (j === 2 && k !== 12) return "nd";
    if (j === 3 && k !== 13) return "rd";
    return "th";
  };

  const suffix = getOrdinalSuffix(position);

  return (
    <span>
      {position}
      <span className="text-xs">{suffix}</span>
    </span>
  );
};

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

interface Student {
  id: string;
  name: string;
  matricule?: string;
  photo_url: string | null;
  gender: string | null;
  dob: string | null;
  departments: {
    name: string;
  };
  classes?: {
    name: string;
  };
  class_students?: {
    level_id: number;
  }[];
}

interface Mark {
  ca_score: number | null;
  exam_score: number | null;
  total_score: number | null;
  grade: string | null;
  courses: {
    name: string;
    coefficient: number;
  };
}

interface ReportCardData {
  student: Student;
  marks: Mark[];
  classStats: {
    average: number;
    minMax: string;
    totalPassed: number;
    classSize: number;
  };
  termAverage: number;
  totalScore: number;
  coefTotal: number;
}

const ReportCards = () => {
  const { userRole, user } = useAuth();
  const [selectedAcademicYear, setSelectedAcademicYear] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [searchMatricule, setSearchMatricule] = useState("");
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [levels, setLevels] = useState<any[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [studentAverages, setStudentAverages] = useState<{
    [key: string]: { average: number; position: number };
  }>({});
  const [reportData, setReportData] = useState<ReportCardData | null>(null);
  const [modalReportData, setModalReportData] = useState<ReportCardData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [fetchingStudents, setFetchingStudents] = useState(false);
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [isClassMaster, setIsClassMaster] = useState(false);
  const [classMasterDepartment, setClassMasterDepartment] = useState<string>("");
  const [classMasterLevel, setClassMasterLevel] = useState<string>("");
  const printRef = useRef<HTMLDivElement>(null);
  const modalPrintRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (userRole === "admin" || userRole === "lecturer") {
      fetchInitialData();
    }
  }, [userRole]);

  useEffect(() => {
    if (selectedAcademicYear && selectedTerm && selectedDepartment && selectedLevel) {
      setFetchingStudents(true);
      fetchStudents();
    } else {
      setStudents([]);
      setStudentAverages({});
    }
  }, [selectedAcademicYear, selectedTerm, selectedDepartment, selectedLevel]);

  useEffect(() => {
    if (students.length > 0 && selectedTerm) {
      calculateStudentAverages();
    }
  }, [students, selectedTerm]);

  useEffect(() => {
    if (selectedStudent && selectedTerm) {
      generateReportCard();
    }
  }, [selectedStudent, selectedTerm]);

  const fetchInitialData = async () => {
    try {
      let isClassMasterLocal = false;
      let classMasterDeptId = "";
      let classMasterLvlId = "";

      // Check if lecturer is class master FIRST
      if (userRole === "lecturer" && user) {
        const { data: lecturerData, error: lecturerError } = await supabase
          .from("lecturers")
          .select("class_master, department_id, level_id")
          .eq("user_id", user.id)
          .single();

        if (lecturerError) {
          console.error("Error fetching lecturer:", lecturerError);
        } else {
          const lecturerInfo = lecturerData as any;
          console.log("Lecturer info:", lecturerInfo); // Debug log
          if (lecturerInfo?.class_master && lecturerInfo?.department_id && lecturerInfo?.level_id) {
            isClassMasterLocal = true;
            classMasterDeptId = lecturerInfo.department_id;
            classMasterLvlId = lecturerInfo.level_id.toString();
            setIsClassMaster(true);
            setClassMasterDepartment(classMasterDeptId);
            setClassMasterLevel(classMasterLvlId);
            console.log("Class master status set to true"); // Debug log
          } else {
            console.log("Not a class master or missing department/level"); // Debug log
          }
        }
      }

      // Get all academic years
      const { data: yearsData, error: ayError } = await supabase
        .from("academic_years")
        .select("id, label, is_active")
        .order("created_at", { ascending: false });
      if (ayError) throw ayError;

      setAcademicYears(yearsData || []);

      // Set active year as default
      const activeYear = yearsData?.find((year) => year.is_active);
      if (activeYear) {
        setSelectedAcademicYear(activeYear.id);
      }

      // Get terms
      const { data: termsData, error: termError } = await supabase
        .from("terms")
        .select("id, label, is_active")
        .order("label");
      if (termError) throw termError;

      setTerms(termsData || []);

      // Set active term as default
      const activeTerm = termsData?.find((term) => term.is_active);
      if (activeTerm) {
        setSelectedTerm(activeTerm.id);
      }

      // Get departments
      const { data: deptData, error: deptError } = await supabase
        .from("departments")
        .select("id, name")
        .order("name");
      if (deptError) throw deptError;

      setDepartments(deptData || []);

      // Get levels
      const { data: levelsData, error: levelsError } = await supabase
        .from("levels")
        .select("id, name")
        .order("name");
      if (levelsError) throw levelsError;

      setLevels(levelsData || []);

      // Set department and level based on user type
      if (isClassMasterLocal) {
        // For class masters, use their assigned department and level
        setSelectedDepartment(classMasterDeptId);
        setSelectedLevel(classMasterLvlId);
        console.log("Set class master filters:", classMasterDeptId, classMasterLvlId); // Debug log
      } else if (userRole === "admin") {
        // For admins, don't auto-select (let them choose)
        // But we could set defaults here if needed
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
    if (!selectedAcademicYear || !selectedTerm || !selectedDepartment || !selectedLevel) {
      setFetchingStudents(false);
      return;
    }

    try {
      // Query students through class_students to ensure proper level filtering
      const { data: classStudentsData, error: classStudentsError } = await supabase
        .from("class_students")
        .select(
          `
          students!inner(
            id,
            name,
            matricule,
            photo_url,
            gender,
            dob,
            departments!inner(name)
          )
        `
        )
        .eq("academic_year_id", selectedAcademicYear)
        .eq("level_id", parseInt(selectedLevel))
        .eq("students.department_id", selectedDepartment)
        .order("students(name)");

      if (classStudentsError) throw classStudentsError;

      // Transform the data to match our interface
      const transformedStudents = classStudentsData?.map(cs => ({
        id: cs.students.id,
        name: cs.students.name,
        matricule: cs.students.matricule,
        photo_url: cs.students.photo_url,
        gender: cs.students.gender,
        dob: cs.students.dob,
        departments: cs.students.departments
      })) || [];

      setStudents(transformedStudents as Student[]);
    } catch (error: any) {
      console.error("Error fetching students:", error);
      toast({
        variant: "destructive",
        title: "Error fetching students",
        description: error.message,
      });
      setStudents([]);
    } finally {
      setFetchingStudents(false);
    }
  };

  const generateReportCard = async () => {
    try {
      setLoading(true);

      if (!selectedStudent || !selectedTerm || !selectedAcademicYear) {
        toast({
          variant: "destructive",
          title: "Missing data",
          description: "Please select student, term and academic year",
        });
        return;
      }

      // Use generate-report-cards edge function for single student
      const { data: reportData, error: reportError } =
        await supabase.functions.invoke("generate-report-cards", {
          body: {
            studentId: selectedStudent,
            termId: selectedTerm,
            academicYearId: selectedAcademicYear,
            format: "json",
          },
        });

      if (reportError) {
        console.error("Error generating report card:", reportError);
        throw reportError;
      }

      if (
        !reportData?.success ||
        !reportData?.data ||
        reportData.data.length === 0
      ) {
        toast({
          variant: "destructive",
          title: "No report card generated",
          description: "Unable to generate report card for this student",
        });
        return;
      }

      const studentReportCard = reportData.data[0];

      // Transform edge function data to match local interface
      const transformedData: ReportCardData = {
        student: {
          id: selectedStudent,
          name: studentReportCard.student_name,
          matricule: studentReportCard.student_id,
          photo_url: studentReportCard.student_photo_base64,
          gender: studentReportCard.gender,
          dob: studentReportCard.dob,
          departments: {
            name: studentReportCard.department,
          },
        },
        marks: studentReportCard.subjects.map((subject: any) => ({
          ca_score: subject.ca_score,
          exam_score: subject.exam_score,
          total_score: subject.average,
          grade: subject.grade,
          courses: {
            name: subject.subject,
            coefficient: subject.coef,
          },
        })),
        classStats: {
          average: studentReportCard.class_profile.class_average,
          minMax: studentReportCard.class_profile.min_max,
          totalPassed: studentReportCard.class_profile.num_passed,
          classSize: studentReportCard.class_profile.num_enrolled,
        },
        termAverage: studentReportCard.performance.term_average,
        totalScore: studentReportCard.performance.total_weighted_score,
        coefTotal: studentReportCard.performance.total_coef,
      };

      setReportData(transformedData);
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

  const generateReportCardForStudent = async (studentId: string) => {
    try {
      if (!selectedTerm || !selectedAcademicYear) {
        toast({
          variant: "destructive",
          title: "Missing data",
          description: "Please select term and academic year",
        });
        return null;
      }

      // Use generate-report-cards edge function for single student
      const { data: reportData, error: reportError } =
        await supabase.functions.invoke("generate-report-cards", {
          body: {
            studentId: studentId,
            termId: selectedTerm,
            academicYearId: selectedAcademicYear,
            format: "json",
          },
        });

      if (reportError) {
        console.error("Error generating report card:", reportError);
        throw reportError;
      }

      if (
        !reportData?.success ||
        !reportData?.data ||
        reportData.data.length === 0
      ) {
        toast({
          variant: "destructive",
          title: "No report card generated",
          description: "Unable to generate report card for this student",
        });
        return null;
      }

      const studentReportCard = reportData.data[0];

      // Return the complete data structure directly from edge function
      // This matches the ReportCardTemplate interface exactly
      return studentReportCard;
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
      return null;
    }
  };

  const handleViewReportCard = async (studentId: string) => {
    const data = await generateReportCardForStudent(studentId);
    if (data) {
      setModalReportData(data);
      setModalOpen(true);
    }
  };

  const handleDownloadSingleReport = async (studentId: string) => {
    try {
      const data = await generateReportCardForStudent(studentId);
      if (!data) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Unable to generate report card data",
        });
        return;
      }

      // Generate PDF for single student
      const printWindow = window.open("", "", "width=900,height=650");
      if (printWindow) {
        const htmlContent = generateReportCardHTML(data);

        // Get academic year and class info for filename
      const academicYear = academicYears.find(ay => ay.id === selectedAcademicYear)?.label || "Academic Year";
      const department = departments.find(d => d.id === selectedDepartment)?.name || "Department";
      const levelInfo = levels.find(l => l.id === selectedLevel);
      const levelName = levelInfo?.name || "Level";
      const levelId = levelInfo?.id || selectedLevel || "ID";
      const className = `${department}_${levelName}_${levelId}`;
      
      // Replace all spaces with underscores for filename
      const fileName = `Report_Card_${data.student_name.replace(/\s+/g, '_')}_${className.replace(/\s+/g, '_')}_${academicYear.replace(/\s+/g, '_')}`;
      
      printWindow.document.write(`
          <html>
            <head>
              <title>${fileName}</title>
              <style>
                ${getPrintStyles()}
              </style>
            </head>
            <body>
              ${htmlContent}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.onload = () => {
          printWindow.focus();
          printWindow.print();
          printWindow.close();
        };
      }

      toast({
        title: "Success",
        description: `Report card for ${data.student_name} is ready to download`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  const calculateStudentAverages = async () => {
    if (!selectedTerm || students.length === 0 || !selectedAcademicYear) return;

    try {
      const averagesData: {
        [key: string]: { average: number; position: number };
      } = {};

      // Use edge functions to calculate averages and positions for all students
      const promises = students.map(async (student) => {
        try {
          // Get student average
          const { data: avgData, error: avgError } =
            await supabase.functions.invoke("get-student-average", {
              body: {
                studentId: student.id,
                termId: selectedTerm,
                academicYearId: selectedAcademicYear,
              },
            });

          if (avgError) {
            console.error(
              `Error getting average for student ${student.id}:`,
              avgError
            );
            return { studentId: student.id, average: 0, position: 0 };
          }

          // Get student position
          const { data: posData, error: posError } =
            await supabase.functions.invoke("get-student-position", {
              body: {
                studentId: student.id,
                termId: selectedTerm,
                academicYearId: selectedAcademicYear,
                departmentId: selectedDepartment,
                levelId: selectedLevel,
              },
            });

          if (posError) {
            console.error(
              `Error getting position for student ${student.id}:`,
              posError
            );
            return {
              studentId: student.id,
              average: avgData?.average || 0,
              position: 0,
            };
          }

          return {
            studentId: student.id,
            average: avgData?.average || 0,
            position: posData?.position || 0,
          };
        } catch (error) {
          console.error(`Error processing student ${student.id}:`, error);
          return { studentId: student.id, average: 0, position: 0 };
        }
      });

      const results = await Promise.all(promises);

      results.forEach((result) => {
        averagesData[result.studentId] = {
          average: result.average,
          position: result.position,
        };
      });

      setStudentAverages(averagesData);
    } catch (error: any) {
      console.error("Error calculating averages:", error);
      toast({
        variant: "destructive",
        title: "Error calculating averages",
        description: error.message,
      });
    }
  };

  const handleSearch = () => {
    const student = students.find(
      (s) =>
        s.name.toLowerCase().includes(searchMatricule.toLowerCase()) ||
        s.matricule?.toLowerCase().includes(searchMatricule.toLowerCase())
    );
    if (student) {
      setSelectedStudent(student.id);
    } else {
      toast({
        variant: "destructive",
        title: "Student not found",
        description: "No student found with that name or matricule",
      });
    }
  };

  const handleBulkPDFGeneration = async () => {
    if (students.length === 0 || !selectedTerm || !selectedAcademicYear) {
      toast({
        variant: "destructive",
        title: "Missing data",
        description: "Please select term and academic year first",
      });
      return;
    }

    setBulkGenerating(true);
    try {
      // Use generate-report-cards edge function
      const { data: reportData, error: reportError } =
        await supabase.functions.invoke("generate-report-cards", {
          body: {
            termId: selectedTerm,
            academicYearId: selectedAcademicYear,
            departmentId: selectedDepartment,
            levelId: selectedLevel,
            format: "json",
          },
        });

      if (reportError) {
        console.error("Error generating report cards:", reportError);
        throw reportError;
      }

      if (
        !reportData?.success ||
        !reportData?.data ||
        reportData.data.length === 0
      ) {
        toast({
          variant: "destructive",
          title: "No report cards generated",
          description: "Unable to generate any report cards",
        });
        return;
      }

      // Transform data to match local interface for template
      const reportCards = reportData.data.map((card: any) => ({
        student: {
          id: card.student_id || "N/A",
          name: card.student_name,
          matricule: card.student_id,
          photo_url: card.student_photo_base64,
          gender: card.gender,
          dob: card.dob,
          departments: {
            name: card.department,
          },
        },
        marks: card.subjects.map((subject: any) => ({
          ca_score: subject.ca_score,
          exam_score: subject.exam_score,
          total_score: subject.average,
          grade: subject.grade,
          courses: {
            name: subject.subject,
            coefficient: subject.coef,
          },
        })),
        classStats: {
          average: card.class_profile.class_average,
          minMax: card.class_profile.min_max,
          totalPassed: card.class_profile.num_passed,
          classSize: card.class_profile.num_enrolled,
        },
        termAverage: card.performance.term_average,
        totalScore: card.performance.total_weighted_score,
        coefTotal: card.performance.total_coef,
      }));

      // Generate combined PDF using the template data directly
      const printWindow = window.open("", "", "width=900,height=650");
      if (printWindow) {
        const htmlContent = reportData.data
          .map((card: any, index: number) => {
            const templateHTML = ReactDOMServer.renderToStaticMarkup(
              <ReportCardTemplate data={card} />
            );
            return index > 0
              ? `<div class="page-break">${templateHTML}</div>`
              : templateHTML;
          })
          .join("");

        // Get academic year and department/level info for filename
      const academicYear = academicYears.find(ay => ay.id === selectedAcademicYear)?.label || "Academic Year";
      const department = departments.find(d => d.id === selectedDepartment)?.name || "Department";
      const levelInfo = levels.find(l => l.id === selectedLevel);
      const levelName = levelInfo?.name || "Level";
      const levelId = levelInfo?.id || selectedLevel || "ID";
      const className = `${department}_${levelName}_${levelId}`;
      
      // Replace all spaces with underscores for filename
      const fileName = `Report_Cards_${academicYear.replace(/\s+/g, '_')}_${className.replace(/\s+/g, '_')}`;
      
      printWindow.document.write(`
          <html>
            <head>
              <title>${fileName}</title>
              <style>
                ${getPrintStyles()}
                .page-break { page-break-before: always; }
              </style>
            </head>
            <body>
              ${htmlContent}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.onload = () => {
          printWindow.focus();
          printWindow.print();
          printWindow.close();
        };
      }

      toast({
        title: "Success",
        description: `Generated ${reportData.data.length} report cards`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setBulkGenerating(false);
    }
  };

  // Excel export utility function based on ExcelReportTemplate
  const exportReportToExcel = async (data: any) => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Report Card", {
      pageSetup: { paperSize: 9, orientation: "portrait" }, // A4 portrait
    });

    // Set default font
    sheet.eachRow((row) => {
      row.font = { name: "Roboto", size: 12 };
    });

    // Headers (English/French)
    sheet.mergeCells("A1:C4");
    sheet.getCell("A1").value =
      "Republic of Cameroon\nPeace – Work – Fatherland\nMinistry of Secondary Education\nGovernment Technical Teacher Training College (G.T.T.T.C) Kumba";
    sheet.getCell("A1").alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
    sheet.getCell("A1").font = { bold: true, size: 11 };

    sheet.mergeCells("E1:G4");
    sheet.getCell("E1").value =
      "République du Cameroun\nPaix – Travail – Patrie\nMinistère des Enseignements Secondaires\nE.N.I.E.T de Kumba";
    sheet.getCell("E1").alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
    sheet.getCell("E1").font = { bold: true, size: 11 };

    // Term Title
    sheet.mergeCells("A6:G6");
    sheet.getCell(
      "A6"
    ).value = `${data.term} Term Academic Report ${data.academic_year}`;
    sheet.getCell("A6").alignment = { horizontal: "center" };
    sheet.getCell("A6").font = { bold: true, size: 13, underline: true };

    // Student Info
    sheet.mergeCells("A8:D8");
    sheet.getCell("A8").value = `Name of Student: ${data.student_name}`;
    sheet.getCell("A8").font = { bold: true };

    sheet.getCell("E8").value = `Matricule: ${data.student_id}`;
    sheet.getCell("A9").value = `DOB: ${data.dob}`;
    sheet.getCell("C9").value = `Gender: ${data.gender}`;
    sheet.getCell("E9").value = `Class: ${data.department}${data.level}`;
    sheet.getCell("A10").value = `POB: ${data.pob || "N/A"}`;
    sheet.getCell("C10").value = `Repeater: ${data.repeater}`;
    sheet.getCell("E10").value = `Class Master: ${data.class_master}`;

    // Subjects Table
    const subjectHeader = [
      "Subjects and Teacher Names",
      "Competencies",
      "CA/20",
      "Exam/20",
      "Avg/20",
      "Coef",
      "Avg*Coef",
      "Grade",
      "Min-Max",
      "Remark",
    ];

    sheet.addRow([]);
    const headerRow = sheet.addRow(subjectHeader);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "f0f0f0" },
      };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    data.subjects.forEach((s: any) => {
      const row = sheet.addRow([
        s.subject,
        s.competencies || "N/A",
        s.ca_score,
        s.exam_score,
        s.average,
        s.coef,
        s.weighted_average,
        s.grade,
        s.min_max_average || "N/A",
        s.remark_on_average || "N/A",
      ]);
      row.eachCell((cell, colNumber) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
        cell.alignment = {
          vertical: "middle",
          horizontal: "center",
          wrapText: true,
        };

        // Color red for scores below 12
        if (
          (colNumber === 3 || colNumber === 4 || colNumber === 5) &&
          Number(cell.value) < 12
        ) {
          cell.font = { color: { argb: "FF0000" } };
        }
        if (colNumber === 7 && Number(s.average) < 12) {
          cell.font = { color: { argb: "FF0000" } };
        }
      });
    });

    // Discipline / Performance / Class Profile
    sheet.addRow([]);
    const jointRow = sheet.addRow([
      "Discipline",
      "Student Performance",
      "Class Profile",
    ]);
    jointRow.eachCell((c) => {
      c.font = { bold: true };
      c.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "f0f0f0" },
      };
      c.alignment = { horizontal: "center", vertical: "middle" };
    });

    // Add discipline, performance, and class profile data
    const maxRows = 8;
    const disciplineData = [
      `Unjustified Abs: ${data.discipline.unjustified_abs}`,
      `Justified Abs: ${data.discipline.justified_abs}`,
      `Lateness: ${data.discipline.late}`,
      `Punishment: ${data.discipline.punishment}`,
      `Conduct: ${data.discipline.conduct}`,
      `Warnings: ${data.discipline.warning}`,
      `Reprimands: ${data.discipline.reprimand}`,
      `Suspensions: ${data.discipline.suspension}`,
    ];

    const performanceData = [
      `Total Score: ${data.performance.total_weighted_score}`,
      `Total Coef: ${data.performance.total_coef}`,
      `Rank: ${data.performance.class_postion}`,
      `Term Average: ${data.performance.term_average}`,
      `Remark: ${data.performance.performance_remark}`,
      "",
      "",
      "",
    ];

    const classProfileData = [
      `Class Average: ${data.class_profile.class_average}`,
      `Min-Max: ${data.class_profile.min_max}`,
      `Enrolled: ${data.class_profile.num_enrolled}`,
      `Passed: ${data.class_profile.num_passed}`,
      `Annual Avg: ${data.class_profile.annual_average}`,
      `Annual Passed: ${data.class_profile.annual_num_passed}`,
      "",
      "",
    ];

    for (let i = 0; i < maxRows; i++) {
      sheet.addRow([
        disciplineData[i] || "",
        performanceData[i] || "",
        classProfileData[i] || "",
      ]);
    }

    // Footer Signatures
    sheet.addRow([]);
    const footer = sheet.addRow([
      "Remarks on Student Performance",
      "Parent/Guardian Signature",
      "Class Master's Signature",
      "Principal",
    ]);
    footer.eachCell((c) => (c.font = { bold: true }));

    sheet.addRow(["", "", "", ""]);

    // Set column widths
    sheet.columns = [
      { width: 30 }, // A
      { width: 20 }, // B
      { width: 12 }, // C
      { width: 12 }, // D
      { width: 12 }, // E
      { width: 8 }, // F
      { width: 15 }, // G
      { width: 10 }, // H
      { width: 15 }, // I
      { width: 25 }, // J
    ];

    return workbook;
  };

  const handleExportToExcel = async () => {
    if (students.length === 0 || !selectedTerm || !selectedAcademicYear) {
      toast({
        variant: "destructive",
        title: "Missing data",
        description: "Please select term and academic year first",
      });
      return;
    }

    try {
      setLoading(true);

      // Use generate-report-cards edge function to get data
      const { data: reportData, error: reportError } =
        await supabase.functions.invoke("generate-report-cards", {
          body: {
            termId: selectedTerm,
            academicYearId: selectedAcademicYear,
            departmentId: selectedDepartment,
            levelId: selectedLevel,
            format: "json",
          },
        });

      if (reportError) {
        console.error("Error generating Excel data:", reportError);
        throw reportError;
      }

      if (
        !reportData?.success ||
        !reportData?.data ||
        reportData.data.length === 0
      ) {
        toast({
          variant: "destructive",
          title: "No data to export",
          description: "Unable to generate Excel data",
        });
        return;
      }

      // Create Excel workbook with multiple sheets
      const mainWorkbook = new ExcelJS.Workbook();

      // Create a worksheet for each student's report card
      for (const studentData of reportData.data) {
        const studentWorkbook = await exportReportToExcel(studentData);
        const studentSheet = studentWorkbook.getWorksheet("Report Card");

        // Copy the sheet to main workbook
        const newSheet = mainWorkbook.addWorksheet(
          studentData.student_name.substring(0, 31)
        );

        // Copy all data from student sheet to new sheet
        studentSheet.eachRow((row, rowNumber) => {
          const newRow = newSheet.getRow(rowNumber);
          row.eachCell((cell, colNumber) => {
            const newCell = newRow.getCell(colNumber);
            newCell.value = cell.value;
            newCell.font = cell.font;
            newCell.alignment = cell.alignment;
            newCell.fill = cell.fill;
            newCell.border = cell.border;
          });
        });

        // Copy merged cells
        studentSheet.model.merges.forEach((merge: any) => {
          newSheet.mergeCells(merge);
        });

        // Copy column widths
        studentSheet.columns.forEach((col, index) => {
          if (newSheet.columns[index]) {
            newSheet.columns[index].width = col.width;
          }
        });

        // Set page setup
        newSheet.pageSetup = {
          paperSize: 9, // A4
          orientation: "portrait",
          margins: {
            left: 0.7,
            right: 0.7,
            top: 0.75,
            bottom: 0.75,
            header: 0.3,
            footer: 0.3,
          },
        };
      }

      // Generate and download Excel file
      const buffer = await mainWorkbook.xlsx.writeBuffer();
      saveAs(
        new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        `Report_Cards_${reportData.data[0]?.term || "Term"}_${
          reportData.data[0]?.academic_year || "Year"
        }.xlsx`
      );

      toast({
        title: "Success",
        description: `Excel file with ${reportData.data.length} report cards exported successfully`,
      });
    } catch (error: any) {
      console.error("Error exporting to Excel:", error);
      toast({
        variant: "destructive",
        title: "Export failed",
        description: error.message,
      });
    } finally {
      setTimeout(() => {
        setLoading(false);
      }, 500);
    }
  };

  // Helper function to get grade from average
  const getGradeFromAverage = (average: number): string => {
    if (average >= 16) return "A";
    if (average >= 14) return "B";
    if (average >= 12) return "C";
    if (average >= 10) return "D";
    if (average >= 8) return "E";
    return "F";
  };

  // Transform data for template - now data comes directly from edge function
  const transformDataForTemplate = (data: any) => {
    // Data now comes directly from the edge function and matches ReportCardTemplate interface
    // Just return it as-is since the edge function provides the complete structure
    return data;
  };

  const getPrintStyles = () => `
    @import url('https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,100..900;1,100..900&display=swap');
    body { 
      font-family: 'Roboto', sans-serif;
      margin: 0; 
      padding: 0;
      background: white;
      color: #000;
      font-size: 12px;
    }
  `;

  const generateReportCardHTML = (
    data: ReportCardData,
    addPageBreak: boolean = false
  ) => {
    const templateData = transformDataForTemplate(data);
    const templateHTML = ReactDOMServer.renderToStaticMarkup(
      <ReportCardTemplate data={templateData} />
    );

    return addPageBreak
      ? `<div class="page-break">${templateHTML}</div>`
      : templateHTML;
  };

  const handlePrint = () => {
    if (printRef.current) {
      const printContent = printRef.current;
      const WinPrint = window.open("", "", "width=900,height=650");
      if (WinPrint) {
        WinPrint.document.write(`
          <html>
            <head>
              <title>Report Card</title>
              <style>${getPrintStyles()}</style>
            </head>
            <body>
              ${printContent.innerHTML}
            </body>
          </html>
        `);
        WinPrint.document.close();
        WinPrint.focus();
        WinPrint.print();
        WinPrint.close();
      }
    }
  };

  // Show loading state while checking permissions
  if (loading) {
    return (
      <div className="md:p-4 space-y-6">
        {/* Header Skeleton */}
        <div className="space-y-2">
          <div className="h-8 w-40 bg-muted-foreground/5 animate-pulse rounded-md" />
          <div className="h-4 w-64 bg-muted-foreground/5 animate-pulse rounded-md" />
        </div>

        {/* Filters Skeleton */}
        <Card className="shadow-none border-0 bg-muted-foreground/[0.01]">
          <CardContent className="space-y-4 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
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
            <div className="space-y-3">
              {/* Table Header */}
              <div className="flex items-center gap-4 pb-3 border-b">
                <div className="h-4 w-12 bg-muted-foreground/5 animate-pulse rounded-md" />
                <div className="h-4 flex-1 bg-muted-foreground/5 animate-pulse rounded-md" />
                <div className="h-4 w-24 bg-muted-foreground/5 animate-pulse rounded-md" />
                <div className="h-4 w-28 bg-muted-foreground/5 animate-pulse rounded-md" />
                <div className="h-4 w-20 bg-muted-foreground/5 animate-pulse rounded-md" />
                <div className="h-4 w-24 bg-muted-foreground/5 animate-pulse rounded-md" />
              </div>

              {/* Table Rows */}
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 py-3">
                  <div className="h-10 w-10 rounded-full bg-muted-foreground/5 animate-pulse" />
                  <div className="h-4 flex-1 bg-muted-foreground/5 animate-pulse rounded-md" />
                  <div className="h-4 w-24 bg-muted-foreground/5 animate-pulse rounded-md" />
                  <div className="h-4 w-28 bg-muted-foreground/5 animate-pulse rounded-md" />
                  <div className="h-4 w-20 bg-muted-foreground/5 animate-pulse rounded-md" />
                  <div className="h-4 w-24 bg-muted-foreground/5 animate-pulse rounded-md" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check access after loading completes
  if (userRole !== "admin" && (userRole === "lecturer" && !isClassMaster)) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-2xl font-bold text-muted-foreground/85">Access Denied</h1>
        <p className="text-sm sm:text-base text-muted-foreground/80">
          Only administrators and class masters can generate report cards.
        </p>
      </div>
    );
  }

  return (
    <div className="md:p-4 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-muted-foreground/85">
          Report Cards
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground/80">
          Generate official student report cards
        </p>
      </div>

      {/* Controls */}
      <Card className="no-print text-muted-foreground/85 shadow-none">
        <CardContent className="space-y-4 pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="academic-year">Academic Year</Label>
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
            <div>
              <Label htmlFor="department">Department {isClassMaster && "(Locked)"}</Label>
              <Select
                value={selectedDepartment}
                onValueChange={setSelectedDepartment}
                disabled={isClassMaster}
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
              <Label htmlFor="level">Level {isClassMaster && "(Locked)"}</Label>
              <Select value={selectedLevel} onValueChange={setSelectedLevel} disabled={isClassMaster}>
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
            <div className="flex gap-2 mt-4 min-h-[2.5rem] collapsible-content" data-state="open">
              <Button
                onClick={handleBulkPDFGeneration}
                className="flex-1 min-w-[200px]"
                disabled={bulkGenerating}
              >
                {bulkGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating {students.length} Reports...
                  </>
                ) : (
                  <>
                    <FileDown className="h-4 w-4 mr-2" />
                    Generate and Print Report Cards ({students.length})
                  </>
                )}
              </Button>
              <Button
                onClick={handleExportToExcel}
                variant="outline"
                className="bg-muted text-primary hover:bg-accent/30 min-w-[140px]"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Export to Excel
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Students Table */}
      {(fetchingStudents || students.length > 0) && selectedAcademicYear && selectedTerm && selectedDepartment && selectedLevel && (
        <Card className="shadow-none pt-6 border-0" data-state="open">
          <CardContent className="px-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 text-muted-foreground/85">
                    <TableHead className="font-medium rounded-tl-md rounded-bl-md">
                      Photo
                    </TableHead>
                    <TableHead className="font-medium">Student Name</TableHead>
                    <TableHead className="font-medium">Matricule</TableHead>
                    <TableHead className="font-medium">Gender</TableHead>
                    <TableHead className="font-medium text-center">
                      Average
                    </TableHead>
                    <TableHead className="font-medium text-center">
                      Position
                    </TableHead>
                    <TableHead className="font-medium rounded-tr-md rounded-br-md">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fetchingStudents ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="animate-spin h-4 w-4 text-muted-foreground/85" />
                          <span className="text-muted-foreground/80">
                            Loading students...
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    students.map((student) => (
                    <TableRow
                      key={student.id}
                      className="hover:bg-muted/30 rounded-md"
                    >
                      <TableCell>
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={student.photo_url || ""} />
                          <AvatarFallback className="bg-accent/30 text-primary text-xs font-bold">
                            {getInitials(student.name || "")}
                          </AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell className="text-muted-foreground/80">
                        {student.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground/80">
                        {student.matricule}
                      </TableCell>
                      <TableCell className="text-muted-foreground/80">
                        {student.gender || "-"}
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground/80 font-medium">
                        {studentAverages[student.id]?.average
                          ? studentAverages[student.id].average.toFixed(2)
                          : "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        {studentAverages[student.id]?.position ? (
                          <Badge
                            variant={
                              studentAverages[student.id].position <= 3
                                ? "default"
                                : "secondary"
                            }
                            className={`font-medium ${
                              studentAverages[student.id].position <= 3
                                ? "bg-primary/10 text-primary hover:bg-primary/10"
                                : "bg-muted hover:bg-accent/30"
                            }`}
                          >
                            {formatOrdinalPosition(
                              studentAverages[student.id].position
                            )}
                          </Badge>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2 min-w-[140px]">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="bg-muted text-primary hover:bg-accent/30 min-w-[60px]"
                                onClick={() => handleViewReportCard(student.id)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            </DialogTrigger>
                          </Dialog>
                          <Button
                            size="sm"
                            className="bg-primary text-primary-foreground hover:bg-primary/90 min-w-[70px]"
                            onClick={() =>
                              handleDownloadSingleReport(student.id)
                            }
                          >
                            <Printer className="h-4 w-4 mr-1" />
                            Print
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal for Individual Report Card */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto gap-6">
          <DialogHeader>
            <DialogTitle className="text-muted-foreground/85">
              Report Card - {modalReportData?.student_name}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground/70 text-xs">
              View and print the student's report card
            </DialogDescription>
          </DialogHeader>
          {modalReportData && (
            <div className="p-12 rounded-md bg-[#f8f8f8]" data-state="open">
              <div ref={modalPrintRef} className="mx-auto">
                <ReportCardTemplate
                  data={transformDataForTemplate(modalReportData)}
                />
              </div>
              <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (modalPrintRef.current) {
                      const printWindow = window.open(
                        "",
                        "",
                        "width=900,height=650"
                      );
                      if (printWindow) {
                        printWindow.document.write(`
                          <html>
                            <head>
                              <title>Report Card - ${
                                modalReportData.student_name
                              }</title>
                              <style>${getPrintStyles()}</style>
                            </head>
                            <body>
                              ${modalPrintRef.current.innerHTML}
                            </body>
                          </html>
                        `);
                        printWindow.document.close();
                        printWindow.onload = () => {
                          printWindow.focus();
                          printWindow.print();
                          printWindow.close();
                        };
                      }
                    }
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Print Report Card
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Report Card */}
      {reportData && (
        <div ref={printRef} className="bg-white max-w-4xl mx-auto collapsible-content" data-state="open">
          <ReportCardTemplate data={transformDataForTemplate(reportData)} />
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="p-6 w-[100%] block text-center mt-[20%] collapsible-content" data-state="open">
          <Loading size="lg" />
        </div>
      )}


      {/* Empty States */}
      {!loading &&
        !fetchingStudents &&
        (!selectedAcademicYear ||
          !selectedTerm ||
          !selectedDepartment ||
          !selectedLevel) && (
          <Card className="shadow-none collapsible-content" data-state="open">
            <CardContent className="py-12">
              <div className="text-center space-y-4">
                <div className="flex justify-center space-x-2 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-40" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-medium text-muted-foreground/85">
                    All Fields Required to Generate Report Cards
                  </h3>
                  <p className="text-sm text-muted-foreground/80 max-w-md mx-auto">
                    Please select all required fields: academic year, term, department, and level.
                    All fields are mandatory to view students and generate report cards.
                  </p>
                </div>
                <div className="pt-2">
                  <div className="flex flex-wrap justify-center gap-2 text-xs text-muted-foreground/">
                    {!selectedAcademicYear && (
                      <span className="bg-destructive/10 text-destructive px-2 py-1 rounded">
                        Academic Year Required
                      </span>
                    )}
                    {!selectedTerm && (
                      <span className="bg-destructive/10 text-destructive px-2 py-1 rounded">
                        Term Required
                      </span>
                    )}
                    {!selectedDepartment && (
                      <span className="bg-destructive/10 text-destructive px-2 py-1 rounded">
                        Department Required
                      </span>
                    )}
                    {!selectedLevel && (
                      <span className="bg-destructive/10 text-destructive px-2 py-1 rounded">
                        Level Required
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

      {!loading &&
        !fetchingStudents &&
        selectedAcademicYear &&
        selectedTerm &&
        selectedDepartment &&
        selectedLevel &&
        students.length === 0 && (
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
                    No students are enrolled in the selected department and
                    level for this academic year. Students must be enrolled
                    before report cards can be generated.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
    </div>
  );
};

export default ReportCards;
