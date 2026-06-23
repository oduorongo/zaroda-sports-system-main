
DROP POLICY IF EXISTS "Allow uploads to circulars bucket" ON storage.objects;

CREATE POLICY "Admins can upload circulars"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'circulars'
    AND (public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'super_admin'::public.app_role))
  );

CREATE POLICY "Admins can update circulars"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'circulars'
    AND (public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'super_admin'::public.app_role))
  );

CREATE POLICY "Admins can delete circulars"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'circulars'
    AND (public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'super_admin'::public.app_role))
  );
