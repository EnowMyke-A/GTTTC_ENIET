import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, Trash2, Edit, Loader2, Search, ArrowUpDown, Camera } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loading } from "@/components/ui/loading";
import { Card, CardContent } from "@/components/ui/card";

interface Student {
  id: string;
  name: string;
  matricule: string;
  gender: string;
  dob: string;
  pob: string | null;
  photo_url: string | null;
  department_id: string;
  created_at: string;
}

interface ClassStudent {
  id: string;
  student_id: string;
  academic_year_id: string;
  promoted: boolean;
  level_id: number | null;
  students: Student | null;
}

interface Department {
  id: string;
  name: string;
  abbreviation: string;
}

interface Level {
  id: number;
  name: string;
}

interface AcademicYear {
  id: string;
  label: string;
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

const Students = () => {
  const [classStudents, setClassStudents] = useState<ClassStudent[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [activeAcademicYear, setActiveAcademicYear] = useState<AcademicYear | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<ClassStudent | null>(
    null
  );
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [filterLevel, setFilterLevel] = useState("1");
  const [filterAcademicYear, setFilterAcademicYear] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const [formData, setFormData] = useState({
    name: "",
    matricule: "",
    gender: "",
    dob: "",
    pob: "",
    department_id: "",
    level_id: "",
    photo: null as File | null,
  });
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const { toast } = useToast();

  // Function to crop image to square using smallest dimension
  const cropImageToSquare = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();
      
      img.onload = () => {
        // Use the smallest dimension for both width and height
        const size = Math.min(img.width, img.height);
        canvas.width = size;
        canvas.height = size;
        
        // Calculate center crop coordinates
        const startX = (img.width - size) / 2;
        const startY = (img.height - size) / 2;
        
        // Draw the cropped image
        ctx.drawImage(img, startX, startY, size, size, 0, 0, size, size);
        
        // Convert canvas to blob and then to file
        canvas.toBlob((blob) => {
          if (blob) {
            const croppedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            });
            resolve(croppedFile);
          }
        }, file.type, 0.9);
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [
        classStudentsResponse,
        levelsResponse,
        academicYearsResponse,
        departmentsResponse,
        activeAcademicYearResponse,
      ] = await Promise.all([
        supabase
          .from("class_students")
          .select(
            `
            id, student_id, academic_year_id, promoted, level_id,
            students!inner (id, name, matricule, gender, dob, pob, photo_url, department_id, created_at)
          `
          )
          .order("created_at"),
        supabase.from("levels").select("id, name").order("name"),
        supabase
          .from("academic_years")
          .select("id, label")
          .order("start_date", { ascending: false }),
        supabase.from("departments").select("id, name, abbreviation").order("name"),
        supabase
          .from("academic_years")
          .select("id, label")
          .eq("is_active", true)
          .maybeSingle(),
      ]);

      if (classStudentsResponse.error) throw classStudentsResponse.error;
      if (levelsResponse.error) throw levelsResponse.error;
      if (academicYearsResponse.error) throw academicYearsResponse.error;
      if (departmentsResponse.error) throw departmentsResponse.error;
      if (activeAcademicYearResponse.error) throw activeAcademicYearResponse.error;

      setClassStudents(classStudentsResponse.data || []);
      setLevels(levelsResponse.data || []);
      setAcademicYears(academicYearsResponse.data || []);
      setDepartments(departmentsResponse.data || []);
      setActiveAcademicYear(activeAcademicYearResponse.data);
      
      // Set default academic year filter to active academic year
      if (activeAcademicYearResponse.data) {
        setFilterAcademicYear(activeAcademicYearResponse.data.id);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    if (!formData.matricule) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Matricule is required",
      });
      setSubmitting(false);
      return;
    }

    if (!activeAcademicYear) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No active academic year found. Please set an active academic year first.",
      });
      setSubmitting(false);
      return;
    }

    try {
      let photoUrl = editingStudent?.students?.photo_url || null;

      // Handle photo upload if a new photo is provided
      if (formData.photo) {
        const fileExt = formData.photo.name.split('.').pop();
        const fileName = `${formData.matricule}-${Date.now()}.${fileExt}`;
        const filePath = `student-photos/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('students')
          .upload(filePath, formData.photo);

        if (uploadError) throw uploadError;
        
        // Get the public URL for the uploaded file
        const { data: { publicUrl } } = supabase.storage
          .from('students')
          .getPublicUrl(filePath);
          
        photoUrl = publicUrl;
      }

      if (editingStudent) {
        // Update student data
        const { error: studentError } = await supabase
          .from("students")
          .update({
            name: formData.name,
            matricule: formData.matricule,
            gender: formData.gender,
            dob: formData.dob,
            pob: formData.pob,
            department_id: formData.department_id,
            photo_url: photoUrl,
          })
          .eq("id", editingStudent.student_id);
        if (studentError) throw studentError;

        // Update class assignment
        const { error: classError } = await supabase
          .from("class_students")
          .update({
            level_id: parseInt(formData.level_id),
            academic_year_id: activeAcademicYear.id,
          })
          .eq("id", editingStudent.id);
        if (classError) throw classError;

        toast({
          title: "Success",
          description: "Student updated successfully",
        });
      } else {
        // Create new student
        const { data: studentData, error: studentError } = await supabase
          .from("students")
          .insert([
            {
              name: formData.name,
              matricule: formData.matricule,
              gender: formData.gender,
              dob: formData.dob,
              pob: formData.pob,
              department_id: formData.department_id,
              photo_url: photoUrl,
            },
          ])
          .select()
          .single();
        if (studentError) throw studentError;

        // Create class assignment
        const { error: classError } = await supabase
          .from("class_students")
          .insert([
            {
              student_id: studentData.id,
              level_id: parseInt(formData.level_id),
              academic_year_id: activeAcademicYear.id,
            },
          ]);
        if (classError) throw classError;

        toast({
          title: "Success",
          description: "Student created successfully",
        });
      }

      setDialogOpen(false);
      setFormData({
        name: "",
        matricule: "",
        gender: "",
        dob: "",
        pob: "",
        department_id: "",
        level_id: "",
        photo: null,
      });
      setPhotoPreview(null);
      setEditingStudent(null);
      fetchData();
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

  const deleteStudent = async (id: string) => {
    setDeleting(true);
    try {
      // First get the student_id from class_students
      const { data: classStudentData, error: fetchError } = await supabase
        .from("class_students")
        .select("student_id")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;
      if (!classStudentData?.student_id) throw new Error("Student not found");

      const studentId = classStudentData.student_id;

      // Delete from class_students table
      const { error: classError } = await supabase
        .from("class_students")
        .delete()
        .eq("student_id", studentId);

      if (classError) throw classError;

      // Delete from marks table
      const { error: marksError } = await supabase
        .from("marks")
        .delete()
        .eq("student_id", studentId);

      if (marksError) throw marksError;

      // Delete from students table (this will cascade delete the student's photo if storage cleanup is set up)
      const { error: studentError } = await supabase
        .from("students")
        .delete()
        .eq("id", studentId);

      if (studentError) throw studentError;

      toast({
        title: "Success",
        description: "Student deleted permanently",
      });

      fetchData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const openEditDialog = (classStudent: ClassStudent) => {
    if (!classStudent.students) return;
    setEditingStudent(classStudent);
    setFormData({
      name: classStudent.students.name,
      matricule: classStudent.students.matricule || "",
      gender: classStudent.students.gender,
      dob: classStudent.students.dob,
      pob: classStudent.students.pob || "",
      department_id: classStudent.students.department_id,
      level_id: classStudent.level_id?.toString() || "",
      photo: null,
    });
    setPhotoPreview(null);
    setDialogOpen(true);
  };

  const getLevelName = (id: number | null) => {
    if (!id) return "Unknown";
    return levels.find((level) => level.id === id)?.name || "Unknown";
  };

  const getAcademicYearLabel = (id: string) => {
    return academicYears.find((year) => year.id === id)?.label || "Unknown";
  };

  const getDepartmentName = (id: string) => {
    return departments.find((dept) => dept.id === id)?.abbreviation || "Unknown";
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  // Filtered and sorted data
  const filteredAndSortedStudents = useMemo(() => {
    let filtered = classStudents.filter((cs) => {
      if (!cs.students) return false;

      const matchesSearch = cs.students.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesDepartment =
        filterDepartment === "all" ||
        cs.students.department_id === filterDepartment;
      const matchesLevel =
        filterLevel === "all" || cs.level_id?.toString() === filterLevel;
      const matchesAcademicYear =
        filterAcademicYear === "all" ||
        cs.academic_year_id === filterAcademicYear;

      return (
        matchesSearch &&
        matchesDepartment &&
        matchesLevel &&
        matchesAcademicYear
      );
    });

    // Sort by name
    filtered.sort((a, b) => {
      if (!a.students || !b.students) return 0;
      const comparison = a.students.name.localeCompare(b.students.name);
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [
    classStudents,
    searchTerm,
    filterDepartment,
    filterLevel,
    filterAcademicYear,
    sortOrder,
  ]);

  if (loading) {
    return (
      <div className="p-4 space-y-6">
        {/* Header Skeleton */}
        <div className="flex justify-between items-start gap-4">
          <div className="space-y-2">
            <div className="h-8 w-32 bg-muted-foreground/5 animate-pulse rounded-md" />
            <div className="h-4 w-56 bg-muted-foreground/5 animate-pulse rounded-md" />
          </div>
          <div className="h-10 w-32 bg-muted-foreground/5 animate-pulse rounded-md" />
        </div>

        {/* Filters Skeleton */}
        <div className="flex flex-col sm:flex-row gap-4 items-center bg-muted-foreground/[0.01] p-4 rounded-lg">
          <div className="flex-1 h-10 bg-muted-foreground/5 animate-pulse rounded-md" />
          <div className="w-full sm:w-48 h-10 bg-muted-foreground/5 animate-pulse rounded-md" />
          <div className="w-full sm:w-48 h-10 bg-muted-foreground/5 animate-pulse rounded-md" />
          <div className="h-10 w-24 bg-muted-foreground/5 animate-pulse rounded-md" />
        </div>

        {/* Table Skeleton - Simplified */}
        <Card className="shadow-none border-0 bg-muted-foreground/[0.01]">
          <CardContent className="p-6">
            <div className="space-y-3">
              {/* Table Header */}
              <div className="flex items-center gap-4 pb-3 border-b">
                <div className="h-4 w-12 bg-muted-foreground/5 animate-pulse rounded-md" />
                <div className="h-4 flex-1 bg-muted-foreground/5 animate-pulse rounded-md" />
                <div className="h-4 w-24 bg-muted-foreground/5 animate-pulse rounded-md" />
                <div className="h-4 w-20 bg-muted-foreground/5 animate-pulse rounded-md" />
                <div className="h-4 w-28 bg-muted-foreground/5 animate-pulse rounded-md" />
                <div className="h-4 w-20 bg-muted-foreground/5 animate-pulse rounded-md" />
              </div>

              {/* Table Rows */}
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 py-3">
                  <div className="h-10 w-10 rounded-full bg-muted-foreground/5 animate-pulse" />
                  <div className="h-4 flex-1 bg-muted-foreground/5 animate-pulse rounded-md" />
                  <div className="h-4 w-24 bg-muted-foreground/5 animate-pulse rounded-md" />
                  <div className="h-4 w-20 bg-muted-foreground/5 animate-pulse rounded-md" />
                  <div className="h-4 w-28 bg-muted-foreground/5 animate-pulse rounded-md" />
                  <div className="h-4 w-20 bg-muted-foreground/5 animate-pulse rounded-md" />
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-muted-foreground/85">
            Students
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground/80">
            Manage student records
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Add Student
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto gap-6">
            <DialogHeader>
              <DialogTitle className="text-muted-foreground/85">
                {editingStudent ? "Edit Student" : "Register Student"}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground/70 text-xs">
                {editingStudent ? "Modify the student details" : "Register a new student"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                {/* Left Column */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      placeholder="e.g., John Doe"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="matricule">Matricule <span className="text-red-500">*</span></Label>
                    <Input
                      id="matricule"
                      placeholder="e.g., ENIET2023001"
                      value={formData.matricule}
                      onChange={(e) =>
                        setFormData({ ...formData, matricule: e.target.value })
                      }
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="gender">Gender</Label>
                      <Select
                        value={formData.gender}
                        onValueChange={(value) =>
                          setFormData({ ...formData, gender: value })
                        }
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">{toTitleCase("Male")}</SelectItem>
                          <SelectItem value="Female">{toTitleCase("Female")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="dob">Date of Birth</Label>
                      <Input
                        id="dob"
                        type="date"
                        value={formData.dob}
                        onChange={(e) =>
                          setFormData({ ...formData, dob: e.target.value })
                        }
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="pob">Place of Birth</Label>
                    <Input
                      id="pob"
                      placeholder="e.g., Kumba"
                      value={formData.pob}
                      onChange={(e) =>
                        setFormData({ ...formData, pob: e.target.value })
                      }
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <Label htmlFor="department">Department</Label>
                      <Select
                        value={formData.department_id}
                        onValueChange={(value) =>
                          setFormData({ ...formData, department_id: value })
                        }
                        required
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
                    
                    
                  </div>
                </div>
                
                {/* Right Column - Photo Section */}
                <div className="space-y-4">
                  <div>
                      <Label htmlFor="level">Level</Label>
                      <Select
                        value={formData.level_id}
                        onValueChange={(value) =>
                          setFormData({ ...formData, level_id: value })
                        }
                        required
                      >
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
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Student Photo (Optional)</Label>
                    <div className="relative">
                      <input
                        id="photo"
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          if (e.target.files && e.target.files[0]) {
                            const originalFile = e.target.files[0];
                            
                            try {
                              // Crop the image to square
                              const croppedFile = await cropImageToSquare(originalFile);
                              setFormData({ ...formData, photo: croppedFile });
                              
                              // Create preview URL from cropped image
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                setPhotoPreview(event.target?.result as string);
                              };
                              reader.readAsDataURL(croppedFile);
                            } catch (error) {
                              toast({
                                variant: "destructive",
                                title: "Error",
                                description: "Failed to process image. Please try again.",
                              });
                            }
                          }
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-6 text-center hover:border-primary/50 hover:bg-muted-foreground/[0.01] transition-colors cursor-pointer">
                        <Camera className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground mb-1">
                          Click here to add a student photo
                        </p>
                        <p className="text-xs text-muted-foreground/70">
                          JPG, PNG or GIF files accepted
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Photo Preview Section */}
                  <div className="flex flex-col items-center space-y-3">
                    {photoPreview ? (
                      <div className="relative">
                        <img
                          src={photoPreview}
                          alt="Photo preview"
                          className="w-32 h-32 object-cover rounded-lg border-2 border-dashed border-primary/30"
                        />
                        <Button
                          type="button"
                          size="sm"
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                          onClick={() => {
                            setPhotoPreview(null);
                            setFormData({ ...formData, photo: null });
                            // Reset file input
                            const fileInput = document.getElementById('photo') as HTMLInputElement;
                            if (fileInput) fileInput.value = '';
                          }}
                        >
                          ×
                        </Button>
                        <p className="text-xs text-green-600 text-center mt-2 font-medium">
                          ✓ Photo ready to upload
                        </p>
                      </div>
                    ) : editingStudent?.students?.photo_url ? (
                      <div className="flex flex-col items-center space-y-2">
                        <Avatar className="h-32 w-32 border-2 border-dashed border-muted-foreground/30">
                          <AvatarImage 
                            src={editingStudent.students.photo_url} 
                            alt="Current student photo"
                            className="object-cover"
                          />
                          <AvatarFallback className="text-2xl">
                            {getInitials(editingStudent.students.name)}
                          </AvatarFallback>
                        </Avatar>
                        <p className="text-xs text-muted-foreground text-center">
                          Current photo
                        </p>
                      </div>
                    ) : (
                      <></>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Academic Year Info */}
              {activeAcademicYear && (
                <div className="bg-muted/30 p-4 rounded-md border collapsible-content" data-state="open">
                  <Label className="text-sm text-muted-foreground">Academic Year</Label>
                  <div className="text-sm font-medium">{activeAcademicYear.label}</div>
                  <div className="text-xs text-muted-foreground">Currently active academic year</div>
                </div>
              )}
              
              {/* Submit Button */}
              <Button type="submit" className="w-full modal-button" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {editingStudent ? "Updating..." : "Registering..."}
                  </>
                ) : (
                  editingStudent ? "Update Student" : "Register Student"
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters and Search */}
      <div className="bg-card rounded-lg p-4 space-y-6 text-muted-foreground/85 border">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground/70 h-4 w-4" />
            <Input
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 search-input"
            />
          </div>

          <div className="flex flex-wrap gap-2 text-muted-foreground/85">
            <Select
              value={filterDepartment}
              onValueChange={setFilterDepartment}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Department" />
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

            <Select value={filterLevel} onValueChange={setFilterLevel}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Level" />
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

            <Select
              value={filterAcademicYear}
              onValueChange={setFilterAcademicYear}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Academic Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {academicYears.map((year) => (
                  <SelectItem key={year.id} value={year.id}>
                    {toTitleCase(year.label)}{activeAcademicYear?.id === year.id ? " (current)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="flex items-center gap-2 border-0 bg-muted hover:bg-accent/30"
            >
              <ArrowUpDown className="h-4 w-4" />
              {sortOrder === "asc" ? "A-Z" : "Z-A"}
            </Button>
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-card rounded-md overflow-hidden">
        <Table>
          <TableHeader className="text-muted-foreground/85">
            <TableRow className="bg-muted/50">
              <TableHead className="rounded-tl-md rounded-bl-md">
                Student
              </TableHead>
              <TableHead>Matricule</TableHead>
              <TableHead>Gender</TableHead>
              <TableHead>Date of Birth</TableHead>
              <TableHead className="text-center">Department</TableHead>
              <TableHead className="rounded-tr-md rounded-br-md">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedStudents.map((classStudent) => (
              <TableRow
                key={classStudent.id}
                className="border-0 text-muted-foreground/80"
              >
                <TableCell className="pt-6">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={classStudent.students?.photo_url || ""}
                      />
                      <AvatarFallback className="bg-accent/30 text-primary text-xs font-bold">
                        {getInitials(classStudent.students?.name || "")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-muted-foreground/80 font-medium">
                        {classStudent.students?.name}
                      </div>
                      {classStudent.students?.pob && (
                        <div className="text-xs text-muted-foreground/80">
                          Born in {classStudent.students.pob}
                        </div>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground/80">
                  {classStudent.students?.matricule || "-"}
                </TableCell>
                <TableCell className="text-muted-foreground/80">
                  {classStudent.students?.gender}
                </TableCell>
                <TableCell>
                  {classStudent.students?.dob
                    ? new Date(classStudent.students.dob).toLocaleDateString(
                        "en-GB",
                        {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        }
                      )
                    : "N/A"}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="secondary" className="bg-muted hover:bg-accent/30">
                    {getDepartmentName(
                      classStudent.students?.department_id || ""
                    )}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => openEditDialog(classStudent)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-muted hover:bg-accent/30"
                      disabled={deleting && deleteId === classStudent.id}
                      onClick={() => {
                        setDeleteId(classStudent.id);
                        setDeleteOpen(true);
                      }}
                    >
                      {deleting && deleteId === classStudent.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredAndSortedStudents.length === 0 && (
              <TableRow className="content-transition">
                <TableCell
                  colSpan={7}
                  className="text-center py-8 text-muted-foreground/80"
                >
                  No students found matching your criteria.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-muted-foreground/85">Delete student?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground/80">
              This action cannot be undone and will permanently remove this
              student from the class.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) deleteStudent(deleteId);
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

export default Students;
