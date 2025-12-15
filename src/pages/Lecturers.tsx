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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

// Displays all courses assigned to a lecturer as badges
const LecturerCoursesBadges = ({ lecturerId, courses }: { lecturerId: string, courses: any[] }) => {
  const [assigned, setAssigned] = useState<string[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("lecturer_courses")
        .select("course_id")
        .eq("lecturer_id", lecturerId);
      setAssigned(data ? data.map((lc: any) => lc.course_id) : []);
    })();
  }, [lecturerId]);
  if (!assigned.length) return null;
  return (
    <div className="flex gap-1 flex-wrap">
      {assigned.map((cid) => {
        const course = courses.find((c) => c.id === cid);
        return course ? (
          <Badge key={cid} variant="secondary" className="bg-muted text-primary">
            {course.name}
          </Badge>
        ) : null;
      })}
    </div>
  );
};

import {
  Plus,
  Building2,
  Trash2,
  Edit,
  Loader2,
  Clock,
  UserCheck,
  Mail,
} from "lucide-react";
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

interface Lecturer {
  id: string;
  user_id: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  photo_url: string | null;
  course_id: string | null;
  class_master: boolean;
  level_id: number | null;
  department_id: string | null;
  created_at: string;
}

interface Course {
  id: string;
  name: string;
  description: string | null;
  coefficient: number;
}

interface Department {
  id: string;
  name: string;
  abbreviation: string | null;
}

interface Level {
  id: number;
  name: string;
}

const Lecturers = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseDeptFilter, setCourseDeptFilter] = useState<string>("");
  const [courseLevelFilter, setCourseLevelFilter] = useState<string>("");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLecturer, setEditingLecturer] = useState<Lecturer | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    course_ids: [] as string[],
    class_master: false,
    department_id: "",
    level_id: "",
  });
  const [lecturerCourseAssignments, setLecturerCourseAssignments] = useState<{course_id: string, lecturer_id: string}[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
    fetchLecturerCourseAssignments();
  }, []);

  const fetchLecturerCourseAssignments = async () => {
    const { data } = await supabase
      .from("lecturer_courses")
      .select("course_id, lecturer_id");
    setLecturerCourseAssignments(data || []);
  };

  const fetchData = async () => {
    try {
      const [
        lecturersResponse,
        coursesResponse,
        departmentsResponse,
        levelsResponse,
      ] = await Promise.all([
        supabase.from("lecturers").select("*").order("created_at"),
        
        // --- UPDATED SECTION ---
        supabase
          .from("courses")
          .select(`
            id, 
            name, 
            description, 
            coefficient, 
            level_id, 
            departments (
              id
            )
          `)
          .order("name"),
        // -----------------------

        supabase
          .from("departments")
          .select("id, name, abbreviation")
          .order("name"),
        supabase.from("levels").select("id, name").order("id"),
      ]);

      if (lecturersResponse.error) throw lecturersResponse.error;
      if (coursesResponse.error) throw coursesResponse.error;
      if (departmentsResponse.error) throw departmentsResponse.error;
      if (levelsResponse.error) throw levelsResponse.error;

      setLecturers(lecturersResponse.data || []);
      setCourses(coursesResponse.data || []);
      setDepartments(departmentsResponse.data || []);
      setLevels(levelsResponse.data || []);
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
      if (!editingLecturer) {
        toast({
          variant: "destructive",
          title: "Error",
          description:
            "Cannot create lecturers from admin panel. Lecturers must sign up themselves.",
        });
        return;
      }

      // Update lecturer info (not course_id)
      const updateData: any = {
        class_master: formData.class_master,
      };

      if (
        formData.class_master &&
        formData.department_id &&
        formData.level_id
      ) {
        updateData.department_id = formData.department_id;
        updateData.level_id = parseInt(formData.level_id);
      } else {
        updateData.department_id = null;
        updateData.level_id = null;
      }

      const { error: lecturerError } = await supabase
        .from("lecturers")
        .update(updateData)
        .eq("id", editingLecturer.id);
      if (lecturerError) throw lecturerError;

      // Update lecturer_courses assignments
      // Remove all current assignments for this lecturer
      await supabase.from("lecturer_courses").delete().eq("lecturer_id", editingLecturer.id);
      // Insert new assignments
      if (formData.course_ids.length > 0) {
        const inserts = formData.course_ids.map((course_id) => ({
          lecturer_id: editingLecturer.id,
          course_id,
        }));
        const { error: courseError } = await supabase.from("lecturer_courses").insert(inserts);
        if (courseError) throw courseError;
      }

      toast({
        title: "Success",
        description: "Lecturer assignment updated successfully",
      });

      setDialogOpen(false);
      setFormData({
        full_name: "",
        phone: "",
        course_ids: [],
        class_master: false,
        department_id: "",
        level_id: "",
      });
      setEditingLecturer(null);
      await fetchData();
      await fetchLecturerCourseAssignments();
      setRefreshKey(k => k + 1);
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


  const deleteLecturer = async (id: string) => {
    setDeleting(true);
    try {
      const { error } = await supabase.from("lecturers").delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Lecturer deleted successfully",
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

  const openEditDialog = async (lecturer: Lecturer) => {
    setEditingLecturer(lecturer);
    // Fetch assigned courses from lecturer_courses
    const { data: lecturerCourses, error } = await supabase
      .from("lecturer_courses")
      .select("course_id")
      .eq("lecturer_id", lecturer.id);
    const assignedCourseIds = lecturerCourses ? lecturerCourses.map((lc: any) => lc.course_id) : [];
    setFormData({
      full_name: lecturer.full_name,
      phone: lecturer.phone || "",
      course_ids: assignedCourseIds,
      class_master: lecturer.class_master,
      department_id: lecturer.department_id || "",
      level_id: lecturer.level_id?.toString() || "",
    });
    setDialogOpen(true);
  };

  const openAddDialog = () => {
    setEditingLecturer(null);
    setFormData({
      full_name: "",
      phone: "",
      course_ids: [],
      class_master: false,
      department_id: "",
      level_id: "",
    });
    setDialogOpen(true);
  };



  const getAvailableCourses = () => {
    // Only show courses that are unassigned or assigned to this lecturer
    const currentLecturerId = editingLecturer?.id;
    const assignedMap = new Map<string, string>();
    lecturerCourseAssignments.forEach((a) => assignedMap.set(a.course_id, a.lecturer_id));
    let filtered = courses.filter((course: any) => {
      const assignedTo = assignedMap.get(course.id);
      return !assignedTo || assignedTo === currentLecturerId;
    });
    if (courseDeptFilter && courseDeptFilter !== "all") {
      filtered = filtered.filter((c: any) =>
        (Array.isArray(c.departments)
          ? c.departments.some((d: any) => d.id === courseDeptFilter)
          : false)
      );
    }

    if (courseLevelFilter && courseLevelFilter !== "all") {
      filtered = filtered.filter((c: any) => c.level_id?.toString() === courseLevelFilter);
    }
    return filtered;
  };

  const getClassName = (
    departmentId: string | null,
    levelId: number | null
  ) => {
    if (!departmentId || !levelId) return "No class assigned";

    const department = departments.find((d) => d.id === departmentId);
    const level = levels.find((l) => l.id === levelId);

    const deptAbbr = department?.abbreviation || department?.name || "Unknown";
    const levelName = level?.name || "Unknown";

    return `${deptAbbr}${levelName}`;
  };

  const isDepartmentLevelTaken = (departmentId: string, levelId: number) => {
    return lecturers.some(
      (lecturer) =>
        lecturer.class_master &&
        lecturer.department_id === departmentId &&
        lecturer.level_id === levelId &&
        lecturer.id !== editingLecturer?.id
    );
  };

  if (loading) {
    return (
      <div className="md:p-4 space-y-6">
        {/* Header Skeleton */}
        <div className="flex justify-between items-start gap-4">
          <div className="space-y-2">
            <div className="h-8 w-32 bg-muted-foreground/5 animate-pulse rounded-md" />
            <div className="h-4 w-96 bg-muted-foreground/5 animate-pulse rounded-md" />
          </div>
        </div>

        {/* Card Grid Skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card
              key={i}
              className="shadow-none border-0 bg-muted-foreground/[0.01]"
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-full bg-muted-foreground/5 animate-pulse" />
                  <div className="h-6 w-40 bg-muted-foreground/5 animate-pulse rounded-md" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="h-4 w-32 bg-muted-foreground/5 animate-pulse rounded-md" />
                <div className="h-4 w-[100%] rounded-md bg-muted-foreground/5 animate-pulse" />
                <div className="flex gap-2 mt-8">
                  <div className="h-8 flex-1 rounded-md bg-muted-foreground/5 animate-pulse" />
                  <div className="h-8 flex-1 rounded-md bg-muted-foreground/5 animate-pulse" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div key={refreshKey} className="md:p-4 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-muted-foreground/85">
            Lecturers
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground/80">
            Assign courses and designate class masters
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="text-sm gap-6">
            <DialogHeader>
              <DialogTitle className="text-muted-foreground/85">Edit Lecturer Assignment</DialogTitle>
              <DialogDescription className="text-muted-foreground/70 text-xs">
                Assign courses and designate class masters here.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Lecturer info */}
              <div className="bg-muted/30 p-3 rounded-lg space-y-2 border">
                <div>
                  <Label className="text-xs text-muted-foreground">Name</Label>
                  <p className="text-sm font-medium mt-1">
                    {formData.full_name}
                  </p>
                </div>
                {formData.phone && (
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Phone
                    </Label>
                    <p className="text-sm font-medium mt-1">{formData.phone}</p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Courses</Label>
                <div className="flex gap-2 mb-2">
                  <Select value={courseDeptFilter} onValueChange={setCourseDeptFilter}>
                    <SelectTrigger className="w-[150px] text-xs">
                      <SelectValue placeholder="All Departments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.abbreviation || dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={courseLevelFilter} onValueChange={setCourseLevelFilter}>
                    <SelectTrigger className="w-[120px] text-xs">
                      <SelectValue placeholder="All Levels" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Levels</SelectItem>
                      {levels.map((level) => (
                        <SelectItem key={level.id} value={level.id.toString()}>
                          {level.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-1 gap-3 mt-2 mb-5 max-h-32 overflow-y-auto border rounded-md p-2 bg-background">
                  {getAvailableCourses().map((course) => (
                    <div key={course.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={course.id}
                        checked={(formData.course_ids ?? []).includes(course.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData((prev) => ({
                              ...prev,
                              course_ids: [...prev.course_ids, course.id],
                            }));
                          } else {
                            setFormData((prev) => ({
                              ...prev,
                              course_ids: prev.course_ids.filter((id) => id !== course.id),
                            }));
                          }
                        }}
                      />
                      <Label htmlFor={course.id} className="text-xs font-light">
                        {course.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="class_master"
                  checked={formData.class_master}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, class_master: !!checked })
                  }
                />
                <Label htmlFor="class_master" className="text-sm font-medium">
                  Designate as Class Master
                </Label>
              </div>

              {formData.class_master && (
                <div
                  className="space-y-4 p-3 border rounded-lg bg-muted/20 collapsible-content"
                  data-state="open"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="department" className="text-xs">
                        Department
                      </Label>
                      <Select
                        value={formData.department_id}
                        onValueChange={(value) =>
                          setFormData({
                            ...formData,
                            department_id: value,
                            level_id: "",
                          })
                        }
                        required={formData.class_master}
                      >
                        <SelectTrigger className="text-sm">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {departments.map((department) => (
                            <SelectItem
                              key={department.id}
                              value={department.id}
                            >
                              {department.abbreviation || department.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="level" className="text-xs">
                        Level
                      </Label>
                      <Select
                        value={formData.level_id}
                        onValueChange={(value) =>
                          setFormData({ ...formData, level_id: value })
                        }
                        required={formData.class_master}
                        disabled={!formData.department_id}
                      >
                        <SelectTrigger className="text-sm">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {levels.map((level) => {
                            const isClassTaken =
                              formData.department_id &&
                              isDepartmentLevelTaken(
                                formData.department_id,
                                level.id
                              );

                            return (
                              <SelectItem
                                key={level.id}
                                value={level.id.toString()}
                                disabled={isClassTaken}
                              >
                                {level.name} {isClassTaken ? "(Taken)" : ""}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {formData.department_id && formData.level_id && (
                    <div className="text-xs text-muted-foreground">
                      Class:{" "}
                      {getClassName(
                        formData.department_id,
                        parseInt(formData.level_id)
                      )}
                    </div>
                  )}
                </div>
              )}

              <Button
                type="submit"
                className="w-full text-sm modal-button"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Apply Updates"
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {lecturers.length === 0 ? (
        <Card className="shadow-[0] border-0">
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
                  No Lecturers Found
                </h3>
                <p className="text-sm text-muted-foreground/80 max-w-md mx-auto">
                  No lecturers have signed up yet. Lecturers can create their
                  own accounts through the sign-up page.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {lecturers.map((lecturer) => (
            <Card key={lecturer.id} className="shadow-[0]">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg ellipse">
                  <div className="bg-muted p-[12px] rounded-[50%]">
                    <UserCheck className="h-4 w-4 text-primary" />
                  </div>
                  <span className="truncate text-muted-foreground/85">{toTitleCase(lecturer.full_name)}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {lecturer.email && (
                    <div className="flex items-center gap-2 p-2 pb-0">
                      <Mail className="h-4 w-4 text-muted-foreground/80" />
                      <span className="text-sm text-muted-foreground/80">
                        {lecturer.email}
                      </span>
                    </div>
                  )}
                  {lecturer.phone && (
                    <div>
                      <span className="text-sm font-medium">Phone:</span>
                      <span className="text-sm text-muted-foreground ml-2">
                        {lecturer.phone}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 min-h-[32px]">
                  <LecturerCoursesBadges lecturerId={lecturer.id} courses={courses} />
                    {lecturer.class_master &&
                      lecturer.department_id &&
                      lecturer.level_id && (
                        <div className="flex items-center gap-2">
                          <div className="mt-1">
                            <Badge
                              variant={"secondary"}
                              className="bg-muted text-primary hover:bg-accent/30"
                            >
                              {getClassName(
                                lecturer.department_id,
                                lecturer.level_id
                              )}
                              &nbsp; Class Master
                            </Badge>
                          </div>
                        </div>
                      )}
                      {
                        lecturerCourseAssignments.filter(a => a.lecturer_id === lecturer.id).length === 0 && (
                          <div>
                            <div className="mt-1">
                              <Badge
                                variant={"destructive"}
                                className="text-destructive bg-destructive/10"
                              >
                                Unverified Lecturer
                              </Badge>
                            </div>
                          </div>
                        )
                      }
                    
                  </div>

                  <div className="flex gap-2 modal-button">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(lecturer)}
                      className="flex-1 border-0 bg-primary text-primary-foreground hover:bg-primary/95 hover:text-primary-foreground"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      {lecturerCourseAssignments.filter(a => a.lecturer_id === lecturer.id).length === 0 ? "Verify" : "Edit"}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        setDeleteId(lecturer.id);
                        setDeleteOpen(true);
                      }}
                      className="flex-1 bg-muted hover:bg-accent/30 text-accent-foreground"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
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
            <AlertDialogTitle className="text-muted-foreground/85">Delete lecturer?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground/80">
              This action cannot be undone and will permanently remove this
              lecturer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) deleteLecturer(deleteId);
                setDeleteOpen(false);
              }}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Lecturers;
