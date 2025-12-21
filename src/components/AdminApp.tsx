import { Routes, Route } from "react-router-dom";
import { Suspense } from "react";
import Navbar from "@/components/Layout/Navbar";
import Sidebar from "@/components/Layout/Sidebar";
import { LoadingOverlay } from "@/components/ui/loading";
import Dashboard from "@/pages/Dashboard";
import AcademicYears from "@/pages/AcademicYears";
import Departments from "@/pages/Departments";
import Courses from "@/pages/Courses";
import Terms from "@/pages/Terms";
import Students from "@/pages/Students";
import Lecturers from "@/pages/Lecturers";
import Analytics from "@/pages/Analytics";
import ReportCards from "@/pages/ReportCards";
import Discipline from "@/pages/Discipline";
import Notifications from "@/pages/Notifications";
import NotFound from "@/pages/NotFound";
import Marks from "@/pages/Marks";
import Council from "@/pages/Council";

const AdminLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <div className="flex relative">
      <Sidebar />
      <main className="flex-1 overflow-auto p-6 ml-0 lg:ml-64">{children}</main>
    </div>
  </div>
);

export const AdminApp = () => {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <AdminLayout>
            <Suspense fallback={<LoadingOverlay message="Loading dashboard..." size="xl" />}>
              <Dashboard />
            </Suspense>
          </AdminLayout>
        }
      />
      <Route
        path="/notifications"
        element={
          <AdminLayout>
            <Suspense fallback={<LoadingOverlay message="Loading notifications..." size="xl" />}>
              <Notifications />
            </Suspense>
          </AdminLayout>
        }
      />
      <Route
        path="/academic-years"
        element={
          <AdminLayout>
            <Suspense fallback={<LoadingOverlay message="Loading academic years..." size="xl" />}>
              <AcademicYears />
            </Suspense>
          </AdminLayout>
        }
      />
      <Route
        path="/departments"
        element={
          <AdminLayout>
            <Suspense fallback={<LoadingOverlay message="Loading departments..." size="xl" />}>
              <Departments />
            </Suspense>
          </AdminLayout>
        }
      />
      <Route
        path="/courses"
        element={
          <AdminLayout>
            <Suspense fallback={<LoadingOverlay message="Loading courses..." size="xl" />}>
              <Courses />
            </Suspense>
          </AdminLayout>
        }
      />
      <Route
        path="/terms"
        element={
          <AdminLayout>
            <Suspense fallback={<LoadingOverlay message="Loading terms..." size="xl" />}>
              <Terms />
            </Suspense>
          </AdminLayout>
        }
      />
      <Route
        path="/students"
        element={
          <AdminLayout>
            <Suspense fallback={<LoadingOverlay message="Loading students..." size="xl" />}>
              <Students />
            </Suspense>
          </AdminLayout>
        }
      />
      <Route
        path="/lecturers"
        element={
          <AdminLayout>
            <Suspense fallback={<LoadingOverlay message="Loading lecturers..." size="xl" />}>
              <Lecturers />
            </Suspense>
          </AdminLayout>
        }
      />
      <Route
        path="/analytics"
        element={
          <AdminLayout>
            <Suspense fallback={<LoadingOverlay message="Loading analytics..." size="xl" />}>
              <Analytics />
            </Suspense>
          </AdminLayout>
        }
      />
      <Route
        path="/report-cards"
        element={
          <AdminLayout>
            <Suspense fallback={<LoadingOverlay message="Loading report cards..." size="xl" />}>
              <ReportCards />
            </Suspense>
          </AdminLayout>
        }
      />
      <Route
        path="/discipline"
        element={
          <AdminLayout>
            <Suspense fallback={<LoadingOverlay message="Loading discipline..." size="xl" />}>
              <Discipline />
            </Suspense>
          </AdminLayout>
        }
      />
      <Route
        path="/marks"
        element={
          <AdminLayout>
            <Suspense fallback={<LoadingOverlay message="Loading marks..." size="xl" />}>
              <Marks />
            </Suspense>
          </AdminLayout>
        }
      />
      <Route path="*" element={<NotFound />} />
      <Route
        path="/class-council"
        element={
          <AdminLayout>
            <Suspense fallback={<LoadingOverlay message="Loading..." size="xl" />}>
              <Council />
            </Suspense>
          </AdminLayout>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};
