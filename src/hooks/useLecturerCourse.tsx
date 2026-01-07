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
        // First, get the lecturer's ID
        const { data: lecturerData, error: lecturerError } = await supabase
          .from("lecturers")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (lecturerError) {
          console.error("Error fetching lecturer:", lecturerError);
          setHasCourse(false);
          setLoading(false);
          return;
        }

        if (!lecturerData) {
          console.error("No lecturer record found for user");
          setHasCourse(false);
          setLoading(false);
          return;
        }

        // Check if lecturer has any assigned courses in lecturer_courses table
        const { data: coursesData, error: coursesError } = await supabase
          .from("lecturer_courses")
          .select("course_id")
          .eq("lecturer_id", lecturerData.id)
          .limit(1);

        if (coursesError) {
          console.error("Error checking lecturer courses:", coursesError);
          setHasCourse(false);
          setLoading(false);
          return;
        }

        // Lecturer has courses if the array has at least one entry
        setHasCourse(!!coursesData && coursesData.length > 0);
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
