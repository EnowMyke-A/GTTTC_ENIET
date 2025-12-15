import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, BookX, LogOut } from "lucide-react";
import LottieAnimation from "@/components/ui/lottie-animation";
import animationData from "@/components/animations/empty box3.json";
import { useAuth } from "@/hooks/useAuth";

export const NoCourseAssigned = () => {
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="max-w-2xl w-full shadow-[0] border-0">
        <CardContent className="py-3 lg:py-16 px-2 lg:px-8">
          <div className="text-center space-y-6">
            {/* Icon */}
            <div className="flex justify-center">
              <div className="bg-muted rounded-full p-6">
                <BookX className="lg:h-12 lg:w-12 h-8 w-8 text-primary" />
              </div>
            </div>

            {/* Title */}
            <div className="space-y-3">
              <h1 className="text-xl lg:text-2xl font-bold text-foreground">
                No Course Assigned Yet
              </h1>
              <p className="text-sm lg:text-md text-muted-foreground max-w-md mx-auto">
                Your account is active, but you haven't been assigned a course yet.
              </p>
            </div>

            {/* Message */}
            <div className="bg-muted/50 rounded-lg p-6 max-w-lg mx-auto">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div className="text-left space-y-2">
                  <p className="text-sm font-medium text-foreground">
                    What you need to do:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Contact your administrator to assign you a course</li>
                    <li>Once assigned, you'll have full access to all lecturer features</li>
                    <li>You'll be able to manage marks, view students, and more</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Additional Info */}
            <div className="pt-4">
              <p className="text-sm text-muted-foreground/80">
                This restriction ensures data integrity and proper course management.
              </p>
            </div>

            {/* Sign Out Button */}
            <div className="pt-6">
              <Button
                onClick={handleSignOut}
                
                className="flex items-center gap-2 mx-auto"
              >
                <LogOut className="h-4 w-4" />
                Exit and Wait
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
