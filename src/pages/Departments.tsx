import { useState, useEffect } from "react";
import LottieAnimation from "@/components/ui/lottie-animation";
import animationData from "@/components/animations/empty box3.json";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Building2, Trash2, Edit, Loader2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loading } from "@/components/ui/loading";

interface Department {
  id: string;
  name: string;
  abbreviation: string | null;
  description: string | null;
  created_at: string;
}

const Departments = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState<string | null>(null);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(
    null
  );
  const [formData, setFormData] = useState({
    name: "",
    abbreviation: "",
    description: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from("departments")
        .select("id, name, abbreviation, description, created_at")
        .order("name");

      if (error) throw error;
      setDepartments((data as unknown as Department[]) || []);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingDepartment) {
        const { error } = await supabase
          .from("departments")
          .update(formData)
          .eq("id", editingDepartment.id);
        if (error) throw error;
        toast({
          title: "Success",
          description: "Department updated successfully",
        });
      } else {
        const { error } = await supabase.from("departments").insert([formData]);
        if (error) throw error;
        toast({
          title: "Success",
          description: "Department created successfully",
        });
      }

      setDialogOpen(false);
      setFormData({ name: "", abbreviation: "", description: "" });
      setEditingDepartment(null);
      fetchDepartments();
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

  const deleteDepartment = async (id: string) => {
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("departments")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Department deleted successfully",
      });

      fetchDepartments();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setDeleting(false);
    }
  };

  const openEditDialog = (department: Department) => {
    setEditingDepartment(department);
    setFormData({
      name: department.name,
      abbreviation: department.abbreviation || "",
      description: department.description || "",
    });
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="md:p-4 space-y-6">
        {/* Header Skeleton */}
        <div className="flex justify-between items-start gap-4 mb-6">
          <div className="space-y-2">
            <div className="h-8 w-40 bg-muted-foreground/5 animate-pulse rounded-md" />
            <div className="h-4 w-64 bg-muted-foreground/5 animate-pulse rounded-md" />
          </div>
          <div className="h-10 w-40 bg-muted-foreground/5 animate-pulse rounded-md" />
        </div>

        {/* Cards Grid Skeleton */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-lg p-6 space-y-4 bg-muted-foreground/[0.01]">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-full bg-muted-foreground/5 animate-pulse" />
                <div className="h-6 w-32 bg-muted-foreground/5 animate-pulse rounded-md" />
                
              </div>
              <div className="h-4 w-20 bg-muted-foreground/5 animate-pulse rounded-md" />
              <div className="space-y-2">
                <div className="h-3 w-full bg-muted-foreground/5 animate-pulse rounded-md" />
                <div className="h-3 w-3/4 bg-muted-foreground/5 animate-pulse rounded-md" />
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
            Departments
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground/80">
            Manage academic departments
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              Add Department
            </Button>
          </DialogTrigger>
          <DialogContent className="gap-6">
            <DialogHeader>
              <DialogTitle className="text-muted-foreground/85">
                {editingDepartment ? "Edit Department" : "Create Department"}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground/70 text-xs">
                {editingDepartment ? "Modify the department details" : "Create a new department"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="name">Department Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Computer Science"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="abbreviation">Abbreviation</Label>
                <Input
                  id="abbreviation"
                  placeholder="e.g., CS"
                  value={formData.abbreviation}
                  onChange={(e) =>
                    setFormData({ ...formData, abbreviation: e.target.value })
                  }
                  maxLength={10}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Department description..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>
              <Button type="submit" className="w-full modal-button" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {editingDepartment ? "Updating..." : "Creating..."}
                  </>
                ) : (
                  editingDepartment ? "Update Department" : "Create Department"
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {departments.length === 0 ? (
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
                  No Departments Found
                </h3>
                <p className="text-sm text-muted-foreground/80 max-w-md mx-auto">
                  No departments have been created yet. Add departments to organize your academic structure and courses.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {departments.map((department) => (
          <Card key={department.id} className="shadow-[0]">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg ellipse">
                <div className="bg-muted p-[12px] rounded-[50%]">
                  <Building2 className="h-4 w-4 text-primary" />
                </div>
               <span className="truncate text-muted-foreground/85">{toTitleCase(department.name)}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {department.description && (
                  <p className="truncate text-sm text-muted-foreground/80 collapsible-content" data-state="open">
                    {toTitleCase(department.description)}
                  </p>
                )}
                <p className="text-xs text-muted-foreground/70">
                  Created:{" "}
                  {new Date(department.created_at).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(department)}
                    className="flex-1 border-0 bg-primary text-primary-foreground hover:bg-primary/95 hover:text-primary-foreground"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={deleting && deleteId === department.id}
                    onClick={() => {
                      setDeleteId(department.id);
                      setDeleteName(department.name);
                      setDeleteOpen(true);
                    }}
                    className="flex-1 bg-muted text-primary hover:bg-accent/30"
                  >
                    {deleting && deleteId === department.id ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
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
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-muted-foreground/85">{`Delete ${deleteName} department?`}</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground/80">
              This action cannot be undone and will permanently remove this
              department.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) deleteDepartment(deleteId);
                setDeleteOpen(false);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Departments;
