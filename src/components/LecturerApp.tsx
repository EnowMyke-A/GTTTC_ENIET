import { Routes, Route, Navigate } from "react-router-dom";
import { Suspense } from "react";
import Navbar from "@/components/Layout/Navbar";
import Sidebar from "@/components/Layout/Sidebar";
import { LoadingOverlay } from "@/components/ui/loading";
import Dashboard from "@/pages/LecturerDashboard";
import Marks from "@/pages/Marks";
import MyCourses from "@/pages/MyCourses";
import Notifications from "@/pages/Notifications";
import NotFound from "@/pages/NotFound";
import { NoCourseAssigned } from "@/components/Lecturer/NoCourseAssigned";
import { useLecturerCourse } from "@/hooks/useLecturerCourse";

const LecturerLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <div className="flex relative">
      <Sidebar />
      <main className="flex-1 overflow-auto p-6 ml-0 lg:ml-64">{children}</main>
    </div>
  </div>
);

// Protected route wrapper that checks for course assignment
const ProtectedLecturerRoute = ({ children }: { children: React.ReactNode }) => {
  const { hasCourse, loading } = useLecturerCourse();

  if (loading) {
    return <LoadingOverlay message="Checking access..." size="xl" />;
  }

  if (!hasCourse) {
    return <NoCourseAssigned />;
  }

  return <>{children}</>;
};

export const LecturerApp = () => {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <ProtectedLecturerRoute>
            <LecturerLayout>
              <Suspense fallback={<LoadingOverlay message="Loading dashboard..." size="xl" />}>
                <Dashboard />
              </Suspense>
            </LecturerLayout>
          </ProtectedLecturerRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedLecturerRoute>
            <LecturerLayout>
              <Suspense fallback={<LoadingOverlay message="Loading notifications..." size="xl" />}>
                <Notifications />
              </Suspense>
            </LecturerLayout>
          </ProtectedLecturerRoute>
        }
      />
      <Route
        path="/marks"
        element={
          <ProtectedLecturerRoute>
            <LecturerLayout>
              <Suspense fallback={<LoadingOverlay message="Loading marks..." size="xl" />}>
                <Marks />
              </Suspense>
            </LecturerLayout>
          </ProtectedLecturerRoute>
        }
      />
      <Route
        path="/my-courses"
        element={
          <ProtectedLecturerRoute>
            <LecturerLayout>
              <Suspense fallback={<LoadingOverlay message="Loading courses..." size="xl" />}>
                <MyCourses />
              </Suspense>
            </LecturerLayout>
          </ProtectedLecturerRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};
