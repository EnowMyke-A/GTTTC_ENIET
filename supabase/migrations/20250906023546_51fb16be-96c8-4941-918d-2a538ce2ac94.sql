-- Create storage policies for student photos
CREATE POLICY "Student photos are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'students');

CREATE POLICY "Admins can upload student photos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'students' AND (auth.jwt() ->> 'role'::text) = 'admin'::text);

CREATE POLICY "Admins can update student photos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'students' AND (auth.jwt() ->> 'role'::text) = 'admin'::text);

CREATE POLICY "Admins can delete student photos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'students' AND (auth.jwt() ->> 'role'::text) = 'admin'::text);