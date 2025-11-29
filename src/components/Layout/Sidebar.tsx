import { useAuth } from "@/hooks/useAuth";
import { useMobileNav } from "@/hooks/useMobileNav";
import { useResponsive } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { NavLink } from "react-router-dom";
import {
  Users,
  GraduationCap,
  BookOpen,
  Calendar,
  Building2,
  FileText,
  BarChart3,
  UserCheck,
  ClipboardList,
  Award,
  X,
  TrendingUp,
  Layers3,
  LayoutPanelLeft,
  Home,
  House,
  Scale
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  className?: string;
}

const Sidebar = ({ className }: SidebarProps) => {
  const { userRole } = useAuth();
  const { isSidebarOpen, closeSidebar } = useMobileNav();
  const { isMobile } = useResponsive();

  const adminNavItems = [
    { icon: House, label: "Dashboard", path: "/" },
    { icon: Calendar, label: "Academic Years", path: "/academic-years" },
    { icon: Layers3, label: "Terms", path: "/terms" },
    { icon: Building2, label: "Departments", path: "/departments" },
    { icon: BookOpen, label: "Courses", path: "/courses" },
    { icon: GraduationCap, label: "Students", path: "/students" },
    { icon: UserCheck, label: "Lecturers", path: "/lecturers" },
    { icon: ClipboardList, label: "Marks", path: "/marks" },
    { icon: Scale, label: "Discipline", path: "/discipline" },
    { icon: FileText, label: "Report Cards", path: "/report-cards" },
    { icon: TrendingUp, label: "Statistics", path: "/analytics" },
   
  ];

  const lecturerNavItems = [
    { icon: House, label: "Dashboard", path: "/" },
    { icon: BookOpen, label: "My Courses", path: "/my-courses" },
    { icon: ClipboardList, label: "Marks", path: "/marks" },
  ];

  const navItems = userRole === "admin" ? adminNavItems : lecturerNavItems;

  const handleNavClick = () => {
    if (isMobile) {
      closeSidebar();
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {isMobile && isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "bg-background transition-transform duration-300 ease-in-out side-navigation",
          isMobile
            ? "fixed left-0 top-16 z-50 w-64 h-[calc(100vh-4rem)] transform"
            : "fixed left-0 top-16 w-64 h-[calc(100vh-4rem)]",
          isMobile && !isSidebarOpen && "-translate-x-full",
          className
        )}
      >
        {/* Mobile header */}
        {isMobile && (
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-lg font-semibold">Navigation</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={closeSidebar}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        <nav className="p-4 pt-8 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={handleNavClick}
              className={({ isActive }) =>
                cn(
                  "flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors",
                  "hover:bg-muted hover:text-accent-foreground",
                  isActive
                    ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
                    : "text-muted-foreground/85"
                )
              }
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              <span className="font-medium truncate">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
