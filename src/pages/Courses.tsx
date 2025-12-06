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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus,
  BookOpen,
  Trash2,
  Edit,
  Loader2,
  ArrowUpDown,
  Filter,
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
import { Textarea } from "@/components/ui/textarea";
import { Loading } from "@/components/ui/loading";

interface Course {
  id: string;
  name: string;
  description: string | null;
  coefficient: number;
  level_id: number;
  created_at: string;
  departments?: Department[];
  level?: Level;
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

const Courses = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    coefficient: "",
    level_id: "",
    department_ids: [] as string[],
  });

  // Filter and Sort states
  const [filterLevel, setFilterLevel] = useState<string>("");
  const [filterDepartment, setFilterDepartment] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [showFilters, setShowFilters] = useState(true);

  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [coursesResponse, departmentsResponse, levelsResponse] =
        await Promise.all([
          supabase
            .from("courses")
            .select(
              `
            *,
            level:levels(id, name),
            departments:course_departments(
              department:departments(id, name, abbreviation)
            )
          `
            )
            .order("name"),
          supabase.from("departments").select("id, name, abbreviation").order("name"),
          supabase.from("levels").select("id, name").order("name"),
        ]);

      if (coursesResponse.error) throw coursesResponse.error;
      if (departmentsResponse.error) throw departmentsResponse.error;
      if (levelsResponse.error) throw levelsResponse.error;

      // Transform the data to include departments array
      const transformedCourses =
        coursesResponse.data?.map((course) => ({
          ...course,
          departments:
            course.departments?.map((cd: any) => cd.department) || [],
        })) || [];

      setCourses(transformedCourses);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const courseData = {
        name: formData.name,
        description: formData.description || null,
        coefficient: parseInt(formData.coefficient),
        level_id: parseInt(formData.level_id),
      };

      let courseId: string;

      if (editingCourse) {
        const { error } = await supabase
          .from("courses")
          .update(courseData)
          .eq("id", editingCourse.id);
        if (error) throw error;

        // Update course-department relationships
        await supabase
          .from("course_departments")
          .delete()
          .eq("course_id", editingCourse.id);

        if (formData.department_ids.length > 0) {
          const courseDepartments = formData.department_ids.map((deptId) => ({
            course_id: editingCourse.id,
            department_id: deptId,
          }));

          const { error: cdError } = await supabase
            .from("course_departments")
            .insert(courseDepartments);
          if (cdError) throw cdError;
        }

        courseId = editingCourse.id;
        toast({
          title: "Success",
          description: "Course updated successfully",
        });
      } else {
        const { data, error } = await supabase
          .from("courses")
          .insert([courseData])
          .select()
          .single();
        if (error) throw error;

        courseId = data.id;

        // Create course-department relationships
        if (formData.department_ids.length > 0) {
          const courseDepartments = formData.department_ids.map((deptId) => ({
            course_id: courseId,
            department_id: deptId,
          }));

          const { error: cdError } = await supabase
            .from("course_departments")
            .insert(courseDepartments);
          if (cdError) throw cdError;
        }

        toast({
          title: "Success",
          description: "Course created successfully",
        });
      }

      setDialogOpen(false);
      setFormData({
        name: "",
        description: "",
        coefficient: "",
        level_id: "",
        department_ids: [],
      });
      setEditingCourse(null);
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

  const deleteCourse = async (id: string) => {
    setDeleting(true);
    try {
      const { error } = await supabase.from("courses").delete().eq("id", id);
      if (error) throw error;

      toast({
        title: "Success",
        description: "Course deleted successfully",
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

  const openEditDialog = (course: Course) => {
    setEditingCourse(course);
    setFormData({
      name: course.name,
      description: course.description || "",
      coefficient: course.coefficient.toString(),
      level_id: course.level_id.toString(),
      department_ids: course.departments?.map((d) => d.id) || [],
    });
    setDialogOpen(true);
  };

  const getDepartmentName = (id: string) => {
    return departments.find((dept) => dept.id === id)?.name || "Unknown";
  };

  const getLevelName = (id: number) => {
    return levels.find((level) => level.id === id)?.name || "Unknown";
  };

  // Filter and sort courses
  useEffect(() => {
    let filtered = [...courses];

    // Apply filters
    if (filterLevel) {
      filtered = filtered.filter(
        (course) => course.level_id.toString() === filterLevel
      );
    }

    if (filterDepartment) {
      filtered = filtered.filter((course) =>
        course.departments?.some((dept) => dept.id === filterDepartment)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const comparison = a.name.localeCompare(b.name);
      return sortOrder === "asc" ? comparison : -comparison;
    });

    setFilteredCourses(filtered);
  }, [courses, filterLevel, filterDepartment, sortOrder]);

  const resetFilters = () => {
    setFilterLevel("");
    setFilterDepartment("");
    setSortOrder("asc");
  };

  if (loading) {
    return (
      <div className="md:p-4 space-y-6">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="space-y-2">
            <div className="h-8 w-32 bg-muted-foreground/5 animate-pulse rounded-md" />
            <div className="h-4 w-56 bg-muted-foreground/5 animate-pulse rounded-md" />
          </div>
          <div className="h-10 w-32 bg-muted-foreground/5 animate-pulse rounded-md" />
        </div>

        {/* Filters Skeleton */}
        <Card className="p-4 shadow-none text-muted-foreground/85 border-0 bg-muted-foreground/[0.01]">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 space-y-2">
              <div className="h-4 w-24 bg-muted-foreground/5 animate-pulse rounded-md" />
              <div className="h-10 w-full rounded-md bg-muted-foreground/5 animate-pulse" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="h-4 w-24 bg-muted-foreground/5 animate-pulse rounded-md" />
              <div className="h-10 w-full rounded-md bg-muted-foreground/5 animate-pulse" />
            </div>
            <div className="h-10 w-24 rounded-md bg-muted-foreground/5 animate-pulse" />
            <div className="h-10 w-32 rounded-md bg-muted-foreground/5 animate-pulse" />
          </div>
        </Card>

        {/* Course Cards Skeleton */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="shadow-none relative pb-12 border-0 bg-muted-foreground/[0.01]">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-full bg-muted-foreground/5 animate-pulse" />
                  <div className="h-6 w-32 bg-muted-foreground/5 animate-pulse rounded-md" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="h-4 w-full bg-muted-foreground/5 animate-pulse rounded-md" />
                <div className="flex gap-2">
                  <div className="h-6 w-20 rounded-md bg-muted-foreground/5 animate-pulse" />
                  <div className="h-6 w-20 rounded-md bg-muted-foreground/5 animate-pulse" />
                </div>
                <div className="flex gap-2 mt-4 absolute bottom-6 left-6 w-[calc(100%-3rem)]">
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
    <div className="md:p-4 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-muted-foreground/85">
            Courses
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground/80">
            Manage academic courses and subjects
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Add Course
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md gap-6">
              <DialogHeader>
                <DialogTitle className="text-muted-foreground/85">
                  {editingCourse ? "Edit Course" : "Create Course"}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground/70 text-xs">
                  {editingCourse ? "Modify the course details" : "Create a new course"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="name">Course Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Mathematics"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Course description (optional)"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="coefficient">Coefficient</Label>
                  <Input
                    id="coefficient"
                    type="number"
                    min="1"
                    max="10"
                    placeholder="e.g., 3"
                    value={formData.coefficient}
                    onChange={(e) =>
                      setFormData({ ...formData, coefficient: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-1">
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
                          {level.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="departments">Departments</Label>
                  <div className="grid grid-cols-1 gap-2 mt-2 max-h-32 overflow-y-auto border rounded-md p-2">
                    {departments.map((dept) => (
                      <div
                        key={dept.id}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={dept.id}
                          checked={formData.department_ids.includes(dept.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFormData({
                                ...formData,
                                department_ids: [
                                  ...formData.department_ids,
                                  dept.id,
                                ],
                              });
                            } else {
                              setFormData({
                                ...formData,
                                department_ids: formData.department_ids.filter(
                                  (id) => id !== dept.id
                                ),
                              });
                            }
                          }}
                        />
                        <Label htmlFor={dept.id} className="text-sm">
                          {dept.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                <Button type="submit" className="w-full modal-button" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {editingCourse ? "Updating..." : "Creating..."}
                    </>
                  ) : (
                    editingCourse ? "Update Course" : "Create Course"
                  )}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {showFilters && (
        <Card className="p-4 shadow-none text-muted-foreground/85 collapsible-content" data-state="open">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="filter-level">Filter by Level</Label>
              <Select value={filterLevel} onValueChange={setFilterLevel}>
                <SelectTrigger id="filter-level">
                  <SelectValue placeholder="All levels" />
                </SelectTrigger>
                <SelectContent>
                  {levels.map((level) => (
                    <SelectItem key={level.id} value={level.id.toString()}>
                      {level.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <Label htmlFor="filter-department">Filter by Department</Label>
              <Select
                value={filterDepartment}
                onValueChange={setFilterDepartment}
              >
                <SelectTrigger id="filter-department">
                  <SelectValue placeholder="All departments" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="w-full sm:w-auto border-0 bg-muted hover:bg-accent/30"
            >
              <ArrowUpDown className="h-4 w-4 mr-2" />
              Sort {sortOrder === "asc" ? "A-Z" : "Z-A"}
            </Button>
            <Button
              variant="outline"
              onClick={resetFilters}
              className="bg-muted border-0 hover:bg-accent/30"
            >
              Reset Filters
            </Button>
          </div>
        </Card>
      )}
      {filteredCourses.length === 0 ? (
        <Card className="shadow-[0] border-0">
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
                  No Courses Found
                </h3>
                <p className="text-sm text-muted-foreground/80 max-w-md mx-auto">
                  {filterLevel || filterDepartment ? "No courses match your current filters. Try adjusting your level or department filter." : "No courses have been created yet. Add courses to get started with curriculum management."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCourses.map((course) => (
          <Card key={course.id} className="shadow-[0] relative pb-12">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="bg-muted p-[12px] rounded-[50%]">
                  <BookOpen className="h-4 w-4 text-primary flex-shrink-0" />
                </div>

                <span className="truncate text-muted-foreground/85">{course.name}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground/80">
              <div className="space-y-3 pb-2">
                {course.description && (
                  <div className="collapsible-content" data-state="open">
                    <p className="text-sm text-muted-foreground/85 mt-1 truncate">
                      {course.description}
                    </p>
                  </div>
                )}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <Badge
                    variant="outline"
                    className="w-fit inline border-0 bg-muted"
                  >
                    COEF {course.coefficient}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="w-fit inline border-0 bg-muted"
                  >
                    Level {getLevelName(course.level_id)}
                  </Badge>
                </div>
                <div className="flex flex-col gap-2 mb-2">
                  <div className="flex flex-wrap gap-1">
                    {course.departments && course.departments.length > 0 ? (
                      course.departments.map((dept) => (
                        <Badge
                          variant="outline"
                          key={dept.id}
                          className="text-xs bg-muted hover:bg-accent/30 border-0 content-transition"
                        >
                          {dept.abbreviation}
                        </Badge>
                      ))
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-xs bg-muted/50 text-muted-foreground border-0 collapsible-content"
                        data-state="open"
                      >
                        No departments
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 mt-4 absolute bottom-6 left-6 w-[calc(100%-3rem)]">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(course)}
                    className="flex-1 border-0 bg-primary text-primary-foreground hover:bg-primary/95 hover:text-primary-foreground"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={deleting && deleteId === course.id}
                    onClick={() => {
                      setDeleteId(course.id);
                      setDeleteName(course.name);
                      setDeleteOpen(true);
                    }}
                    className="flex-1 bg-muted hover:bg-accent/30 text-accent-foreground"
                  >
                    {deleting && deleteId === course.id ? (
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
            <AlertDialogTitle className="text-muted-foreground/85">{`Delete ${deleteName} course?`}</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground/80">
              This action cannot be undone and will permanently remove this
              course.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) deleteCourse(deleteId);
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

export default Courses;
