import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Users, Trash2, Edit, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface Class {
  id: string;
  name: string;
  department_id: string;
  academic_year_id: string;
  created_at: string;
}

interface Department {
  id: string;
  name: string;
}

interface AcademicYear {
  id: string;
  label: string;
}

const Classes = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    department_id: '',
    academic_year_id: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [classesResponse, departmentsResponse, academicYearsResponse] = await Promise.all([
        supabase.from('classes').select('*').order('name'),
        supabase.from('departments').select('id, name').order('name'),
        supabase.from('academic_years').select('id, label').order('start_date', { ascending: false })
      ]);

      if (classesResponse.error) throw classesResponse.error;
      if (departmentsResponse.error) throw departmentsResponse.error;
      if (academicYearsResponse.error) throw academicYearsResponse.error;

      setClasses(classesResponse.data || []);
      setDepartments(departmentsResponse.data || []);
      setAcademicYears(academicYearsResponse.data || []);
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
      if (editingClass) {
        const { error } = await supabase
          .from('classes')
          .update(formData)
          .eq('id', editingClass.id);
        if (error) throw error;
        toast({ title: "Success", description: "Class updated successfully" });
      } else {
        const { error } = await supabase
          .from('classes')
          .insert([formData]);
        if (error) throw error;
        toast({ title: "Success", description: "Class created successfully" });
      }

      setDialogOpen(false);
      setFormData({ name: '', department_id: '', academic_year_id: '' });
      setEditingClass(null);
      fetchData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const deleteClass = async (id: string) => {
    try {
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Class deleted successfully",
      });

      fetchData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setDeleteId(null);
    }
  };

  const openEditDialog = (classItem: Class) => {
    setEditingClass(classItem);
    setFormData({
      name: classItem.name,
      department_id: classItem.department_id,
      academic_year_id: classItem.academic_year_id,
    });
    setDialogOpen(true);
  };

  const getDepartmentName = (id: string) => {
    return departments.find(dept => dept.id === id)?.name || 'Unknown';
  };

  const getAcademicYearLabel = (id: string) => {
    return academicYears.find(year => year.id === id)?.label || 'Unknown';
  };

  if (loading) {
    return (
      <div className="p-6 w-[100%] block text-center mt-[20%]">
        <Loader2 className="animate-spin h-10 w-10 m-auto" />
      </div>
    );
  }

  return (
    <div className="md:p-4 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary">
            Classes
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Manage academic classes
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              Add Class
            </Button>
          </DialogTrigger>
          <DialogContent className="gap-6">
            <DialogHeader>
              <DialogTitle className="text-muted-foreground/85">
                {editingClass ? "Edit Class" : "Create Class"}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground/70 text-xs">
                {editingClass ? "Modify the class details" : "Create a new class"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="name">Class Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Year 1 Computer Science"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-1">
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
                    {departments.map((department) => (
                      <SelectItem key={department.id} value={department.id}>
                        {department.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="academic_year">Academic Year</Label>
                <Select
                  value={formData.academic_year_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, academic_year_id: value })
                  }
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
              <Button type="submit" className="w-full modal-button">
                {editingClass ? "Update Class" : "Create Class"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {classes.map((classItem) => (
          <Card key={classItem.id}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                {classItem.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium">Department:</span>
                  <Badge variant="secondary" className="ml-2">
                    {getDepartmentName(classItem.department_id)}
                  </Badge>
                </div>
                <div>
                  <span className="text-sm font-medium">Academic Year:</span>
                  <Badge variant="outline" className="ml-2">
                    {getAcademicYearLabel(classItem.academic_year_id)}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Created: {new Date(classItem.created_at).toLocaleDateString()}
                </p>
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(classItem)}
                    className="flex-1"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => { setDeleteId(classItem.id); setDeleteOpen(true); }}
                    className="flex-1"
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
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-muted-foreground/85">Delete class?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground/80">
              This action cannot be undone and will permanently remove this class.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteId) deleteClass(deleteId); setDeleteOpen(false); }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Classes;