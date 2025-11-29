import { useAuth } from "@/hooks/useAuth";
import { useMobileNav } from "@/hooks/useMobileNav";
import { useResponsive } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  GraduationCap,
  User,
  LogOut,
  Settings,
  Menu,
  X,
  Bell,
} from "lucide-react";
import { Link } from "react-router-dom";

const Navbar = () => {
  const { user, userRole, userFullName, signOut } = useAuth();
  const { isSidebarOpen, toggleSidebar } = useMobileNav();
  const { isMobile } = useResponsive();

  // Dummy notification count - in real app this would come from a hook or context
  const unreadNotificationCount = 2;

  return (
    <header className="text-primary bg-muted/50 shadow-[0] sticky top-0 z-50 border-b border-border/50 top-navigation">
      <div className="w-full px-6">
        <div className="flex items-center justify-between h-16 max-w-none">
          <div className="flex items-center space-x-4 flex-shrink-0">
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                className="text-primary hover:bg-accent -ml-2"
              >
                {isSidebarOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </Button>
            )}

            <div className="flex items-center space-x-2 flex-shrink-0">
              <div className="bg-primary p-2 rounded-[8px] flex-shrink-0">
                <GraduationCap className="h-6 w-6 sm:h-6 sm:w-6 text-primary-foreground" />
              </div>
              <div className="hidden sm:block flex-shrink-0">
                <h1 className="text-lg sm:text-lg font-bold mb-0 whitespace-nowrap">
                  GTTTC ENIET
                </h1>
                <p className="text-xs opacity-90 mt-[0] whitespace-nowrap">
                  School Management System
                </p>
              </div>
              <div className="sm:hidden flex-shrink-0">
                <h1 className="text-sm font-bold whitespace-nowrap">GTTTC ENIET</h1>
                <p className="text-xs opacity-90 whitespace-nowrap">SMS</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
            {/* Notification Button */}
            <Link to="/notifications">
              <Button
                variant="ghost"
                size="icon"
                className="relative text-primary mr-4 bg-muted hover:bg-accent/30 flex-shrink-0 w-10 h-10"
              >
                <Bell className="h-6 w-6" />
                {unreadNotificationCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {unreadNotificationCount > 9
                      ? "9+"
                      : unreadNotificationCount}
                  </Badge>
                )}
              </Button>
            </Link>

            {!isMobile && (
              <div className="text-xs text-muted-foreground min-w-[120px] text-right">
                <span className="opacity-75">Welcome, </span>
                <span className="font-medium text-primary truncate">{userFullName || user?.email || 'User'}</span>
                <div className="text-xs opacity-75 capitalize font-medium">
                  {userRole == "admin" ? "administrator" : userRole || 'user'}
                </div>
              </div>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-primary-foreground bg-primary rounded-[50%] hover:bg-primary/90 hover:text-primary-foreground flex-shrink-0 w-10 h-10"
                >
                  <User className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 shadow-[0]">
                {isMobile && (
                  <>
                    <DropdownMenuItem className="text-sm">
                      <span className="opacity-75">Welcome, </span>
                      <span className="font-medium truncate">
                        {userFullName || user?.email}
                      </span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-xs opacity-75 capitalize">
                      {userRole} Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem className="text-muted-foreground/85 hover:bg-muted hover:text-accent-foreground">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={signOut}
                  className="text-muted-foreground/85 hover:bg-muted hover:text-accent-foreground"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
