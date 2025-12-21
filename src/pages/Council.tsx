import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
} from "recharts";
import {
  TrendingUp,
  Loader2,
  Users,
  BookOpen,
  Award,
  GraduationCap,
} from "lucide-react";
import { Loading } from "@/components/ui/loading";

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

const Council = () => {
  const { userRole } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [selectedTerm, setSelectedTerm] = useState("");
  const [selectedAcademicYear, setSelectedAcademicYear] = useState("");
  const [terms, setTerms] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const COLORS = [
    "#8b5cf6",
    "#06b6d4",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#ec4899",
  ];

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

  return (
    <div className="flex flex-col items-center justify-center h-[70vh]">
      <h1 className="text-2xl sm:text-3xl font-bold text-muted-foreground/85 mb-2">Class Council</h1>
      <p className="text-muted-foreground/80 text-center max-w-md">Give the final verdict on a student's promotion, dismissal and more </p>
    </div>
  );
              
        
           
}
           
         

export default Council;
