import { useState, useEffect } from "react";
import LottieAnimation from "@/components/ui/lottie-animation";
import animationData from "@/components/animations/empty box3.json";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar, CheckCircle, Circle, Loader2, Edit } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Loading } from "@/components/ui/loading";

interface AcademicYear {
  id: string;
  label: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
}

const AcademicYears = () => {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingYear, setEditingYear] = useState<AcademicYear | null>(null);
  const [formData, setFormData] = useState({
    label: "",
    start_date: "",
    end_date: "",
    is_active: false,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchAcademicYears();
  }, []);

  const fetchAcademicYears = async () => {
    try {
      const { data, error } = await supabase
        .from("academic_years")
        .select("*")
        .order("start_date", { ascending: false });

      if (error) throw error;
      setAcademicYears(data || []);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingYear) {
        const { error } = await supabase
          .from("academic_years")
          .update(formData)
          .eq("id", editingYear.id);
        if (error) throw error;
        toast({ title: "Success", description: "Academic year updated successfully" });
      } else {
        const { error } = await supabase
          .from("academic_years")
          .insert([formData]);
        if (error) throw error;
        toast({ title: "Success", description: "Academic year created successfully" });
      }

      setDialogOpen(false);
      setFormData({
        label: "",
        start_date: "",
        end_date: "",
        is_active: false,
      });
      setEditingYear(null);
      fetchAcademicYears();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("academic_years")
        .update({ is_active: !currentStatus })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Academic year status updated",
      });

      fetchAcademicYears();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const openEditDialog = (year: AcademicYear) => {
    setEditingYear(year);
    setFormData({
      label: year.label,
      start_date: year.start_date,
      end_date: year.end_date,
      is_active: year.is_active,
    });
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="md:p-4 space-y-6">
        {/* Header Skeleton */}
        <div className="flex justify-between items-start gap-4 mb-6">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-muted-foreground/5 animate-pulse rounded-md" />
            <div className="h-4 w-64 bg-muted-foreground/5 animate-pulse rounded-md" />
          </div>
          <div className="h-10 w-40 bg-muted-foreground/5 animate-pulse rounded-md" />
        </div>

        {/* Cards Grid Skeleton */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-lg p-6 space-y-4 bg-muted-foreground/[0.01]">
              <div className="flex items-center justify-between">
                <div className="h-6 w-32 bg-muted-foreground/5 animate-pulse rounded-md" />
                <div className="h-6 w-20 bg-muted-foreground/5 animate-pulse rounded-md" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-24 bg-muted-foreground/5 animate-pulse rounded-md" />
                <div className="h-4 w-28 bg-muted-foreground/5 animate-pulse rounded-md" />
              </div>
              <div className="flex gap-2 pt-2">
                <div className="h-8 flex-1 bg-muted-foreground/5 animate-pulse rounded-md" />
                <div className="h-8 flex-1 bg-muted-foreground/5 animate-pulse rounded-md" />
              </div>
            </div>
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
            Academic Years
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground/80">
            Manage academic year cycles
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              Add Academic Year
            </Button>
          </DialogTrigger>
          <DialogContent className="gap-6">
            <DialogHeader>
              <DialogTitle className="text-muted-foreground/85">
                {editingYear ? "Edit Academic Year" : "Add Academic Year"}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground/70 text-xs">
                {editingYear ? "Modify the academic year details" : "Create a new academic year"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="label">Academic Year Label</Label>
                <Input
                  id="label"
                  placeholder="e.g., 2023-2024"
                  value={formData.label}
                  onChange={(e) =>
                    setFormData({ ...formData, label: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) =>
                    setFormData({ ...formData, start_date: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="end_date">End Date</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) =>
                    setFormData({ ...formData, end_date: e.target.value })
                  }
                  required
                />
              </div>
              <Button type="submit" className="w-full modal-button" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {editingYear ? "Updating..." : "Creating..."}
                  </>
                ) : (
                  editingYear ? "Update Academic Year" : "Create Academic Year"
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {academicYears.length === 0 ? (
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
                <h3 className="font-medium text-muted-foreground/85">
                  No Academic Years Found
                </h3>
                <p className="text-sm text-muted-foreground/80 max-w-md mx-auto">
                  No academic years have been created yet. Add academic years to organize your school calendar and terms.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {academicYears.map((year) => (
          <Card key={year.id} className="relative shadow-[0]">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="p-[12px] rounded-[50%] bg-muted">
                    <Calendar className="h-4 w-4 text-primary" />
                  </div>

                  <span className="text-muted-foreground/85">{year.label}</span>
                </CardTitle>
                <Badge variant={year.is_active ? "default" : "secondary"} className={`${year.is_active ? "" : "bg-muted"}`}>
                  {year.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div>
                <p className="text-xs text-muted-foreground/80 mb-2">
                  <span className="font-medium">Start:</span>{" "}
                  {new Date(year.start_date).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
                <p className="text-xs text-muted-foreground/80">
                  <span className="font-medium">End:</span>{" "}
                  {new Date(year.end_date).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
                <div className="flex gap-2 mt-4">
                  <Button
                    
                    size="sm"
                    onClick={() => openEditDialog(year)}
                    className="flex-1"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleActive(year.id, year.is_active)}
                    className="flex-1 bg-muted border-0 hover:bg-accent/30"
                  >
                    {year.is_active ? (
                      <>
                        <Circle className="h-4 w-4 mr-1" />
                        Inactive
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Active
                      </>
                    )}
                  </Button>
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

export default AcademicYears;
