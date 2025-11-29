import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const useLecturerCourse = () => {
  const { user, userRole } = useAuth();
  const [hasCourse, setHasCourse] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkLecturerCourse = async () => {
      // Only check for lecturers
      if (userRole !== "lecturer" || !user) {
        setHasCourse(true); // Allow admins and non-lecturers
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("lecturers")
          .select("id, course_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          console.error("Error checking lecturer course:", error);
          setHasCourse(false);
          return;
        }

        // Check if lecturer exists and has a course assigned
        setHasCourse(!!data && !!data.course_id);
      } catch (error) {
        console.error("Unexpected error checking lecturer course:", error);
        setHasCourse(false);
      } finally {
        setLoading(false);
      }
    };

    checkLecturerCourse();
  }, [user, userRole]);

  return { hasCourse, loading };
};
