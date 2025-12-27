import { useState, useEffect } from "react";
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
import { Label } from "@/components/ui/label";
import { exportSummaryStatisticsToExcel } from "@/components/ExcelSummaryStatistics";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  Legend,
} from "recharts";
import {
  Users,
  TrendingUp,
  Award,
  BookOpen,
  GraduationCap,
  FileSpreadsheet,
  Calendar,
  Building2,
  AlertCircle,
} from "lucide-react";
import { Loading } from "@/components/ui/loading";

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

function formatAverage(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(num) ? '0.00' : num.toFixed(2);
}

interface AnalyticsData {
  totalStudents: number;
  totalCourses: number;
  averageGrade: number;
  passRate: number;
  gradeDistribution: { grade: string; count: number; percentage: number }[];
  coursePerformance: { course: string; average: number; enrollment: number }[];
  termComparison: { term: string; average: number }[];
  departmentStats: { department: string; students: number; average: number }[];
}

const Analytics = () => {
  const { userRole } = useAuth();
  const [analytics, setAnalytics] = useState<any>(null);
  const [selectedTerm, setSelectedTerm] = useState("");
  const [selectedAcademicYear, setSelectedAcademicYear] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [selectedLevel, setSelectedLevel] = useState("all");
  const [terms, setTerms] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [levels, setLevels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchingStats, setFetchingStats] = useState(false);
  const [downloadingExcel, setDownloadingExcel] = useState(false);
  const { toast } = useToast();

  const COLORS = [
    "#8b5cf6",
    "#06b6d4",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#ec4899",
  ];

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

      if (activeYear) {
        setSelectedAcademicYear(activeYear.id);
      }

      // Get all terms
      const { data: termsData, error: termsError } = await supabase
        .from("terms")
        .select("*")
        .order("is_active", { ascending: false });

      if (termsError) throw termsError;

      // Order terms as First, Second, Third, Annual and ensure Annual is included
      let allTerms = [...(termsData || [])];
      
      // Check if Annual term exists, if not add it
      const hasAnnual = allTerms.some(term => term.label?.toLowerCase() === 'annual');
      if (!hasAnnual) {
        allTerms.push({
          id: 'annual',
          label: 'Annual',
          is_active: false
        });
      }
      
      const orderedTerms = allTerms.sort((a, b) => {
        const termOrder = { 'first': 1, 'second': 2, 'third': 3, 'annual': 4 };
        const aOrder = termOrder[a.label?.toLowerCase()] || 999;
        const bOrder = termOrder[b.label?.toLowerCase()] || 999;
        return aOrder - bOrder;
      });

      // Get active term
      const activeTerm = termsData?.find((t) => t.is_active) || termsData?.[0];

      if (activeTerm) {
        setSelectedTerm(activeTerm.id);
      }

      setTerms(orderedTerms);
      setAcademicYears(academicYearsData || []);

      // Get departments
      const { data: departmentsData, error: departmentsError } = await supabase
        .from("departments")
        .select("*")
        .order("name");
      if (departmentsError) throw departmentsError;

      // Get levels
      const { data: levelsData, error: levelsError } = await supabase
        .from("levels")
        .select("*")
        .order("id");
      if (levelsError) throw levelsError;

      setDepartments(departmentsData || []);
      setLevels(levelsData || []);
    } catch (error: any) {
      toast.error("Error loading data: " + error.message);
    } finally {
      setTimeout(() => {
        setLoading(false);
      }, 500);
    }
  };

  const fetchStatistics = async () => {
    if (!selectedAcademicYear || !selectedTerm) return;

    try {
      setFetchingStats(true);
      
      // Get the selected term label
      const selectedTermData = terms.find(t => t.id === selectedTerm);
      const termLabel = selectedTermData?.label || '';
      
      const { data, error } = await supabase.functions.invoke('get-statistics', {
        body: {
          academicYearId: selectedAcademicYear,
          termLabel: termLabel,
          departmentId: selectedDepartment === "all" ? null : selectedDepartment,
          levelId: selectedLevel === "all" ? null : selectedLevel,
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        toast.error('Failed to fetch statistics. Please try again.');
        return;
      }

      if (!data?.success) {
        console.error('Edge function returned error:', data?.error);
        toast.error(data?.error || 'Failed to fetch statistics');
        return;
      }

      setAnalytics(data.data);
      console.log('Statistics data:', data.data);
    } catch (error: any) {
      console.error('Error fetching statistics:', error);
      toast.error('Error loading statistics: ' + (error.message || 'Unknown error'));
    } finally {
      setFetchingStats(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, [userRole]);

  useEffect(() => {
    if (selectedAcademicYear && selectedTerm && !loading) {
      fetchStatistics();
    }
  }, [selectedAcademicYear, selectedTerm, selectedDepartment, selectedLevel, loading]);

  const downloadExcelSummary = async () => {
    if (!selectedAcademicYear || !selectedTerm) {
      toast.error("Please select academic year and term");
      return;
    }

    try {
      setDownloadingExcel(true);

      // Get the selected term label
      const selectedTermData = terms.find(t => t.id === selectedTerm);
      const termLabel = selectedTermData?.label || '';
      
      const { data, error } = await supabase.functions.invoke('get-statistics', {
        body: {
          academicYearId: selectedAcademicYear,
          termLabel: termLabel,
          departmentId: selectedDepartment === "all" ? null : selectedDepartment,
          levelId: selectedLevel === "all" ? null : selectedLevel,
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        toast.error('Failed to fetch statistics. Please try again.');
        return;
      }

      if (!data?.success) {
        console.error('Edge function returned error:', data?.error);
        toast.error(data?.error || 'Failed to fetch statistics');
        return;
      }

      // Transform and combine data for Excel template
      const subjectMap = new Map();
      
      data.data.summaryDocument.statistics.forEach((stat: any) => {
        const subjectName = stat.subject;
        
        if (subjectMap.has(subjectName)) {
          // Combine with existing subject
          const existing = subjectMap.get(subjectName);
          
          // Combine enrollment
          existing.enrollment.boys += stat.enrollment?.boys || 0;
          existing.enrollment.girls += stat.enrollment?.girls || 0;
          existing.enrollment.total += stat.enrollment?.total || 0;
          
          // Combine passed >=10 counts
          existing.passedGte10.boys += stat.passedGte10?.boys || 0;
          existing.passedGte10.girls += stat.passedGte10?.girls || 0;
          existing.passedGte10.total += stat.passedGte10?.total || 0;
          
          // Combine avg <=5 counts
          existing.avgLte5.boys += stat.avgLte5?.boys || 0;
          existing.avgLte5.girls += stat.avgLte5?.girls || 0;
          existing.avgLte5.total += stat.avgLte5?.total || 0;
          
          // Store for weighted average calculation
          existing.totalScoreSum += (stat.classAverage || 0) * (stat.enrollment?.total || 0);
          existing.totalEnrollmentSum += stat.enrollment?.total || 0;
          
        } else {
          // Create new subject entry
          subjectMap.set(subjectName, {
            subject: subjectName,
            enrollment: {
              boys: stat.enrollment?.boys || 0,
              girls: stat.enrollment?.girls || 0,
              total: stat.enrollment?.total || 0
            },
            topics: { planned: "", taught: "", percentage: "" },
            periods: { planned: "", taught: "", percentage: "" },
            average: stat.classAverage || 0,
            passedGte10: {
              boys: stat.passedGte10?.boys || 0,
              girls: stat.passedGte10?.girls || 0,
              total: stat.passedGte10?.total || 0,
              boys_percentage: stat.passedGte10?.boys_percentage || 0,
              girls_percentage: stat.passedGte10?.girls_percentage || 0,
              total_percentage: stat.passedGte10?.total_percentage || 0
            },
            avgLte5: { 
              boys: stat.avgLte5?.boys || 0,
              girls: stat.avgLte5?.girls || 0,
              total: stat.avgLte5?.total || 0
            },
            totalScoreSum: (stat.classAverage || 0) * (stat.enrollment?.total || 0),
            totalEnrollmentSum: stat.enrollment?.total || 0
          });
        }
      });
      
      // Calculate final percentages and weighted averages for combined subjects
      const combinedSubjects = Array.from(subjectMap.values()).map(subject => {
        // Calculate weighted average
        subject.average = subject.totalEnrollmentSum > 0 
          ? parseFloat((subject.totalScoreSum / subject.totalEnrollmentSum).toFixed(2))
          : 0;
        
        // Recalculate percentages for passed >=10
        subject.passedGte10.boys_percentage = subject.enrollment.boys > 0
          ? parseFloat((subject.passedGte10.boys / subject.enrollment.boys * 100).toFixed(1))
          : 0;
        subject.passedGte10.girls_percentage = subject.enrollment.girls > 0
          ? parseFloat((subject.passedGte10.girls / subject.enrollment.girls * 100).toFixed(1))
          : 0;
        subject.passedGte10.total_percentage = subject.enrollment.total > 0
          ? parseFloat((subject.passedGte10.total / subject.enrollment.total * 100).toFixed(1))
          : 0;
        
        // Remove temporary calculation fields
        const { totalScoreSum, totalEnrollmentSum, ...cleanSubject } = subject;
        return cleanSubject;
      });

      const summaryData = {
        title: `${termLabel.toUpperCase()} TERM RESULTS SUMMARY STATISTICS`,
        institutionName: "GTTTC KUMBA",
        academicYear: analytics.summaryDocument?.header?.academicYear,
        department: analytics.summaryDocument?.header?.department,
        level: analytics.summaryDocument?.header?.level,
        subjects: combinedSubjects
          .sort((a, b) => {
            // First sort by total enrollment descending
            if (b.enrollment.total !== a.enrollment.total) {
              return b.enrollment.total - a.enrollment.total;
            }
            // If enrollment is the same, sort by subject name ascending (alphabetically)
            return a.subject.localeCompare(b.subject);
          })
      };

      // Generate Excel workbook using ExcelJS
      const workbook = await exportSummaryStatisticsToExcel(summaryData);
      
      // Generate and download Excel file
      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(
        new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        `${termLabel}_Summary_Statistics_${new Date().toISOString().split('T')[0]}.xlsx`
      );

      toast.success("Excel summary downloaded successfully!");
    } catch (error: any) {
      console.error('Error downloading Excel:', error);
      toast.error('Error downloading Excel: ' + (error.message || 'Unknown error'));
    } finally {
      setDownloadingExcel(false);
    }
  };

  if (userRole !== "admin") {
    return (
      <div className="p-6 text-center">
        <h1 className="text-2xl font-bold text-muted-foreground/85">Access Denied</h1>
        <p className="text-muted-foreground/80">
          Only administrators can access analytics.
        </p>
      </div>
    );
  }

  if (loading || fetchingStats) {
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

        {/* Content Skeleton */}
        <Card className="shadow-none border-0 bg-muted-foreground/[0.01]">
          <CardContent className="p-6">
            <div className="space-y-3">
              {/* Stats Cards Skeleton */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-20 rounded-md bg-muted-foreground/5 animate-pulse" />
                  </div>
                ))}
              </div>
              
              {/* Charts Skeleton */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
                {[1, 2].map((i) => (
                  <div key={i} className="h-64 rounded-md bg-muted-foreground/5 animate-pulse" />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="md:p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-muted-foreground/85">
            Statistics
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground/80">
            Comprehensive academic performance analytics
          </p>
        </div>
        {analytics && (
          <Button
            onClick={downloadExcelSummary}
            disabled={downloadingExcel || !selectedAcademicYear || !selectedTerm}
            className="flex items-center gap-2"
          >
            <FileSpreadsheet className="h-4 w-4" />
            {downloadingExcel ? "Downloading..." : "Download Excel Summary"}
          </Button>
        )}
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
              <Label htmlFor="department">Department</Label>
              <Select
                value={selectedDepartment}
                onValueChange={setSelectedDepartment}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {toTitleCase(dept.name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="level">Level</Label>
              <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                <SelectTrigger>
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
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

      {/* Analytics Content */}
      {!analytics ? (
        <Card className="text-muted-foreground shadow-[0]">
          <CardContent className="p-6">
            <div className="text-center py-12">
              <TrendingUp className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Analytics Dashboard
              </h3>
              <p className="text-muted-foreground/80 max-w-md mx-auto">
                Select your filters above to view comprehensive statistics and analytics for the academic performance.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="hover:bg-muted bg-muted/90 border-[0]">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-bold text-muted-foreground/85">Total Students</p>
                    <p className="text-xl font-bold min-h-[2rem] flex items-center">{analytics.enrollmentStats?.enrolled?.total || 0}</p>
                    <p className="text-xs text-muted-foreground">
                      Boys: {analytics.enrollmentStats?.enrolled?.boys || 0} | 
                      Girls: {analytics.enrollmentStats?.enrolled?.girls || 0}
                    </p>
                  </div>
                  <div className="bg-accent p-3 rounded-[50%] mt-[-7px] ml-[-7px]">
                    <Users className="h-4 w-4 primary-text" />
                  </div>
                  
                </div>
              </CardContent>
            </Card>
            
            <Card className="hover:bg-muted bg-muted/90 border-[0]">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-bold text-muted-foreground/85">Pass Rate</p>
                    <p className="text-xl font-bold min-h-[2rem] flex items-center">{analytics.passFailStats?.passed?.percentageTotal || 0}%</p>
                    <p className="text-xs text-muted-foreground">
                      {analytics.passFailStats?.passed?.total || 0} of {analytics.enrollmentStats?.satForExams?.total || 0} students
                    </p>
                  </div>
                  <div className="bg-accent p-3 rounded-[50%] mt-[-7px] ml-[-7px]">
                    <Award className="h-4 w-4 primary-text" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="hover:bg-muted bg-muted/90 border-[0]">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-bold text-muted-foreground/85">Courses</p>
                    <p className="text-xl font-bold min-h-[2rem] flex items-center">{analytics.summaryDocument?.statistics?.length || 0}</p>
                    <p className="text-xs text-muted-foreground">
                      Total courses evaluated
                    </p>
                  </div>
                  <div className="bg-accent p-3 rounded-[50%] mt-[-7px] ml-[-7px]">
                    <BookOpen className="h-4 w-4 primary-text" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="hover:bg-muted bg-muted/90 border-[0]">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-bold text-muted-foreground/85">Exam Participation</p>
                    <p className="text-xl font-bold min-h-[2rem] flex items-center">{analytics.enrollmentStats?.satForExams?.percentage || 0}%</p>
                    <p className="text-xs text-muted-foreground">
                      {analytics.enrollmentStats?.satForExams?.total || 0} students sat for exams
                    </p>
                  </div>
                  <div className="bg-accent p-3 rounded-[50%] mt-[-7px] ml-[-7px]">
                    <GraduationCap className="h-4 w-4 primary-text" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pass/Fail Chart */}
            <Card className="hover:bg-muted bg-muted/90 border-[0] shadow-[0]">
              <CardHeader>
                <CardTitle className="text-base text-muted-foreground/85">Performance Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart className="text-sm">
                    <Pie className="text-sm"
                      data={[
                        { name: 'Passed', value: analytics.passFailStats?.passed?.total || 0 },
                        { name: 'Failed', value: analytics.passFailStats?.failed?.total || 0 }
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      <Cell fill="#06553A" />
                      <Cell fill="#5A8E7C" />
                    </Pie>
                    <Legend className="text-sm"
                      formatter={(value, entry: any) => {
                        return `${entry.payload.name}: ${entry.payload.value}`;
                      }}
                    />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Gender Distribution Chart */}
            <Card className="hover:bg-muted bg-muted/90 border-[0] shadow-[0]">
              <CardHeader>
                <CardTitle className="text-base text-muted-foreground/85">Gender Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart className="text-sm" data={[
                    { category: 'Passed', boys: analytics.passFailStats?.passed?.boys || 0, girls: analytics.passFailStats?.passed?.girls || 0 },
                    { category: 'Failed', boys: analytics.passFailStats?.failed?.boys || 0, girls: analytics.passFailStats?.failed?.girls || 0 }
                  ]}>
                    <CartesianGrid strokeDasharray="2 2" />
                    <XAxis dataKey="category" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="boys" fill="#06553A" name="Boys" />
                    <Bar dataKey="girls" fill="#5A8E7C" name="Girls" />
                    <Legend />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Top/Bottom Courses */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top 3 Courses */}
            <Card className="shadow-[0]">
              <CardHeader>
                <CardTitle className="text-base text-muted-foreground/85">Top Performing Courses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.top3Courses?.map((course: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-xs">{course.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Level {course.level} • {course.enrollment} student(s) • {course.passRate}% pass rate
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary text-sm">{formatAverage(course.average)}</p>
                        <p className="text-xs text-muted-foreground">Avg Score</p>
                      </div>
                    </div>
                  )) || <p className="text-muted-foreground">No data available</p>}
                </div>
              </CardContent>
            </Card>

            {/* Bottom 3 Courses */}
            <Card className="shadow-[0]">
              <CardHeader>
                <CardTitle className="text-base text-muted-foreground/85">Least Performing Courses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.bottom3Courses?.map((course: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                          {Math.abs(analytics.summaryDocument?.statistics?.length - ((analytics.summaryDocument?.statistics?.length !== 2 ? 2 : 1) - index)) || 0}
                        </div>
                        <div>
                          <p className="font-medium text-xs">{course.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Level {course.level} • {course.enrollment} student(s) • {course.passRate}% pass rate
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-red-600 text-sm">{formatAverage(course.average)}</p>
                        <p className="text-xs text-muted-foreground">Avg Score</p>
                      </div>
                    </div>
                  )) || <p className="text-muted-foreground">No data available</p>}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top/Bottom Students */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top 3 Students */}
            <Card className="shadow-[0]">
              <CardHeader>
                <CardTitle className="text-base text-muted-foreground/85">Top Performing Students</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.top3Students?.map((student: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gold text-white rounded-full flex items-center justify-center text-xs font-bold" style={{backgroundColor: index === 0 ? '#06553A' : index === 1 ? '#5A8E7C' : '#91B4A7' }}>
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-xs">{student.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {student.gender} • Level {student.level} • {toTitleCase(student.department)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary text-sm">{formatAverage(student.average)}</p>
                        <p className="text-xs text-muted-foreground">Avg Score</p>
                      </div>
                    </div>
                  )) || <p className="text-muted-foreground">No data available</p>}
                </div>
              </CardContent>
            </Card>

            {/* Bottom 3 Students */}
            <Card className="shadow-[0]">
              <CardHeader>
                <CardTitle className="text-base text-muted-foreground/85">Least Performing Students</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.bottom3Students?.map((student: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                          {Math.abs(analytics.enrollmentStats?.satForExams?.total - ((analytics.enrollmentStats?.satForExams?.total !== 2 ? 2 : 1) - index)) || 0}
                        </div>
                        <div>
                          <p className="font-medium text-xs">{student.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {student.gender} • Level {student.level} • {toTitleCase(student.department)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-red-600 text-sm">{formatAverage(student.average)}</p>
                        <p className="text-xs text-muted-foreground">Avg Score</p>
                      </div>
                    </div>
                  )) || <p className="text-muted-foreground">No data available</p>}
                </div>
              </CardContent>
            </Card>
          </div>
          {/* Department/Course Performance Line Chart */}
            <Card className="hover:bg-muted bg-muted/90 border-[0] shadow-[0]">
              <CardHeader>
                <CardTitle className="text-base text-muted-foreground/85">
                  {selectedDepartment === 'all' ? 'Departmental Performance' : 'Subject Performance'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div style={{ width: '100%', overflowX: 'auto' }}>
                  <ResponsiveContainer width="100%" height={380} minWidth={800}>
                    <AreaChart 
                      data={
                        selectedDepartment === 'all' 
                          // Show department performance when "All Departments" is selected
                          ? analytics.departmentPerformance?.details
                              .sort((a: any, b: any) => a.name.localeCompare(b.name))
                              .map(dept => ({
                                subject: dept.abbreviation?.length > 15 ? dept.abbreviation.substring(0, 15) + '...' : dept.abbreviation || dept.name,
                                average: dept.departmentScore,
                                fullSubject: `${dept.name} (${dept.abbreviation}) - Score: ${dept.departmentScore} | Pass Rate: ${dept.passRate}% | Avg: ${dept.averageAcademicPerformance}`,
                                departmentScore: dept.departmentScore,
                                passRate: dept.passRate,
                                avgPerformance: dept.averageAcademicPerformance
                              })) || []
                          // Show course averages when specific department is selected
                          : (() => {
                              const courseMap = new Map();
                              
                              analytics.summaryDocument?.statistics?.forEach((stat: any) => {
                                const subjectName = stat.subject;
                                
                                if (courseMap.has(subjectName)) {
                                  const existing = courseMap.get(subjectName);
                                  existing.totalScore += (stat.classAverage || 0) * (stat.enrollment?.total || 0);
                                  existing.totalEnrollment += stat.enrollment?.total || 0;
                                } else {
                                  courseMap.set(subjectName, {
                                    subject: subjectName,
                                    totalScore: (stat.classAverage || 0) * (stat.enrollment?.total || 0),
                                    totalEnrollment: stat.enrollment?.total || 0
                                  });
                                }
                              });
                              
                              return Array.from(courseMap.values())
                                .map(course => ({
                                  subject: course.subject.length > 15 ? course.subject.substring(0, 15) + '...' : course.subject,
                                  average: course.totalEnrollment > 0 
                                    ? parseFloat((course.totalScore / course.totalEnrollment).toFixed(2))
                                    : 0,
                                  fullSubject: course.subject
                                }))
                                .sort((a, b) => a.subject.localeCompare(b.subject));
                            })()
                      }
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <defs>
                      <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="2%" stopColor="#06553A" stopOpacity={1}/>
                        <stop offset="98%" stopColor="#06553A" stopOpacity={0.01}/>
                      </linearGradient>
                    </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.8} />
                      <XAxis 
                        dataKey="subject" 
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        interval={0}
                        tick={{ fontSize: 8 }}
                      />
                      <YAxis 
                        domain={selectedDepartment === 'all' ? [0, 100] : [0, 20]}
                        tick={{ fontSize: 8 }}
                      />
                      <Tooltip 
                        formatter={(value: any, name: any) => {
                          if (selectedDepartment === 'all') {
                            const labels = {
                              average: 'Department Score',
                              departmentScore: 'Department Score', 
                              passRate: 'Pass Rate (%)',
                              avgPerformance: 'Avg Academic Performance'
                            };
                            return [`${value}`, labels[name] || name];
                          }
                          return [`${value}`, 'Average Score'];
                        }}
                        labelFormatter={(label: any, payload: any) => {
                          const fullSubject = payload?.[0]?.payload?.fullSubject || label;
                          return `Course: ${fullSubject}`;
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="average" 
                        stroke="#065539c2"
                        strokeWidth={2}
                        fill="url(#colorGradient)"
                      />
                      {selectedDepartment === 'all' && (
                        <Legend 
                          content={() => {
                            const departments = analytics.departmentPerformance?.details || [];
                            const sortedDepts = [...departments].sort((a: any, b: any) => b.departmentScore - a.departmentScore);
                            
                            return (
                              <div style={{ 
                                display: 'flex', 
                                flexWrap: 'wrap', 
                                justifyContent: 'center', 
                                gap: '16px', 
                                padding: '10px',
                                fontSize: '10px',
                                maxHeight: '80px',
                                overflowY: 'auto'
                              }}>
                                {sortedDepts.map((dept: any, index: number) => (
                                  <div key={dept.id} style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '6px',
                                    color: '#06553A',
                                    fontWeight: index < 3 ? 'bold' : 'normal'
                                  }}>
                                    <div style={{ 
                                      width: '12px', 
                                      height: '12px', 
                                      backgroundColor: '#06553A', 
                                      borderRadius: '2px',
                                      opacity: 0.8
                                    }} />
                                    <span>{dept.abbreviation || dept.name}: {dept.departmentScore.toFixed(1)}</span>
                                  </div>
                                ))}
                              </div>
                            );
                          }}
                        />
                      )}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
        </div>
      )}
    </div>
  );
};

export default Analytics;
