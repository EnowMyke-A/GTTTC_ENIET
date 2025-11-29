import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar, CheckCircle, Circle, Loader2, Edit, Layers3 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loading } from "@/components/ui/loading";

interface Term {
  id: string;
  label: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  academic_year_id?: string;
}

const Terms = () => {
  const [terms, setTerms] = useState<Term[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTerm, setEditingTerm] = useState<Term | null>(null);
  const [formData, setFormData] = useState({
    label: "",
    start_date: "",
    end_date: "",
    is_active: false,
    academic_year_id: "",
  });
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState("");

  useEffect(() => {
    // Fetch academic years for selection
    const fetchAcademicYears = async () => {
      const { data, error } = await supabase
        .from("academic_years")
        .select("id, label, start_date, end_date")
        .order("start_date", { ascending: false });
      if (!error) setAcademicYears(data || []);
    };
    fetchAcademicYears();
  }, []);

  useEffect(() => {
    if (!editingTerm && academicYears.length > 0) {
      setSelectedAcademicYear(academicYears[0].id);
      setFormData((fd) => ({ ...fd, academic_year_id: academicYears[0].id }));
    }
  }, [academicYears, editingTerm]);
  const { toast } = useToast();

  useEffect(() => {
    fetchTerms();
  }, []);

  const fetchTerms = async () => {
    try {
      const { data, error } = await supabase
        .from("terms")
        .select("*")
        .order("start_date", { ascending: false });

      if (error) throw error;
      setTerms(data || []);
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
    try {
      if (editingTerm) {
        const { error } = await supabase
          .from("terms")
          .update(formData)
          .eq("id", editingTerm.id);
        if (error) throw error;
        toast({ title: "Success", description: "Term updated successfully" });
      } else {
        const { error } = await supabase
          .from("terms")
          .insert([formData]);
        if (error) throw error;
        toast({ title: "Success", description: "Term created successfully" });
      }

      setDialogOpen(false);
      setFormData({
        label: "",
        start_date: "",
        end_date: "",
        is_active: false,
        academic_year_id: selectedAcademicYear || "",
      });
      setEditingTerm(null);
      fetchTerms();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("terms")
        .update({ is_active: !currentStatus })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Term status updated",
      });

      fetchTerms();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const openEditDialog = (term: Term) => {
    setEditingTerm(term);
    setSelectedAcademicYear(term.academic_year_id || "");
    setFormData({
      label: term.label,
      start_date: term.start_date,
      end_date: term.end_date,
      is_active: term.is_active,
      academic_year_id: term.academic_year_id || "",
    });
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="md:p-4 space-y-6">
        {/* Header Skeleton */}
        <div className="flex justify-between items-start gap-4 mb-6">
          <div className="space-y-2">
            <div className="h-8 w-24 bg-muted-foreground/5 animate-pulse rounded-md" />
            <div className="h-4 w-56 bg-muted-foreground/5 animate-pulse rounded-md" />
          </div>
          <div className="h-10 w-32 bg-muted-foreground/5 animate-pulse rounded-md" />
        </div>

        {/* Cards Grid Skeleton */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-lg p-6 space-y-4 bg-muted-foreground/[0.01]">
              <div className="flex items-center justify-between">
                <div className="h-6 w-24 bg-muted-foreground/5 animate-pulse rounded-md" />
                <div className="h-6 w-20 bg-muted-foreground/5 animate-pulse rounded-md" />
              </div>
              <div className="space-y-2">
              <div className="h-4 w-24 bg-muted-foreground/5 animate-pulse rounded-md" />
              <div className="h-4 w-32 bg-muted-foreground/5 animate-pulse rounded-md" />
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
          <h1 className="text-2xl sm:text-3xl font-bold text-muted-foreground/85">Terms</h1>
          <p className="text-sm sm:text-base text-muted-foreground/80">
            Manage academic terms
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90" disabled>
              <Plus className="h-4 w-4 mr-2" />
              Add Term
            </Button>
          </DialogTrigger>
          <DialogContent className="gap-6">
            <DialogHeader>
              <DialogTitle className="text-muted-foreground/85">
                {editingTerm ? "Edit Term" : "Create Term"}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground/70 text-xs">
                {editingTerm ? "Modify the term details" : "Create a new term"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="label">Term Label</Label>
                <Select
                  value={formData.label}
                  onValueChange={(value) =>
                    setFormData({ ...formData, label: value })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select term" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="First">First</SelectItem>
                    <SelectItem value="Second">Second</SelectItem>
                    <SelectItem value="Third">Third</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="academic_year">Academic Year</Label>
                <Select
                  value={selectedAcademicYear}
                  onValueChange={(value) => {
                    setSelectedAcademicYear(value);
                    setFormData((fd) => ({ ...fd, academic_year_id: value }));
                    // Optionally reset dates if out of new range
                  }}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select academic year" />
                  </SelectTrigger>
                  <SelectContent>
                    {academicYears.map((year) => (
                      <SelectItem key={year.id} value={year.id}>
                        {year.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  min={
                    academicYears.find((y) => y.id === selectedAcademicYear)?.start_date || undefined
                  }
                  max={
                    academicYears.find((y) => y.id === selectedAcademicYear)?.end_date || undefined
                  }
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
                  min={
                    academicYears.find((y) => y.id === selectedAcademicYear)?.start_date || undefined
                  }
                  max={
                    academicYears.find((y) => y.id === selectedAcademicYear)?.end_date || undefined
                  }
                  onChange={(e) =>
                    setFormData({ ...formData, end_date: e.target.value })
                  }
                  required
                />
              </div>
              <Button type="submit" className="w-full modal-button">
                {editingTerm ? "Update Term" : "Create Term"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...terms].reverse().map((term) => (
          <Card key={term.id} className="relative shadow-[0]">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="p-[12px] rounded-[50%] bg-muted">
                    <Layers3 className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-muted-foreground/85">{term.label} Term</span>
                </CardTitle>
                <Badge variant={term.is_active ? "default" : "secondary"} className={`${term.is_active ? "" : "bg-muted"}`}>
                  {term.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div>
                <p className="text-xs text-muted-foreground/80 mb-2">
                  <span className="font-medium">Start:</span>{" "}
                  {new Date(term.start_date).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
                <p className="text-xs text-muted-foreground/80">
                  <span className="font-medium">End:</span>{" "}
                  {new Date(term.end_date).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
                <div className="flex gap-2 mt-4">
                  <Button
                    size="sm"
                    onClick={() => openEditDialog(term)}
                    className="flex-1"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleActive(term.id, term.is_active)}
                    className="flex-1 bg-muted border-0 hover:bg-accent/30"
                    disabled
                  >
                    {term.is_active ? (
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
    </div>
  );
};

export default Terms;