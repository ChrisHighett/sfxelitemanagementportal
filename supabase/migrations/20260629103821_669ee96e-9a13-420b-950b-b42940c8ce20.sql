
-- Resources bucket is now private. Add a scoped SELECT policy that mirrors
-- the access model used for athlete data elsewhere.
--
-- File path convention for athlete-scoped files in this bucket:
--   development-tracker/<athlete_uuid>/<filename>
-- For any other (non-athlete-scoped) path we deny read by default; admins
-- and eleva_ops can still read everything in the bucket for tooling.

DROP POLICY IF EXISTS "resources_scoped_read" ON storage.objects;

CREATE POLICY "resources_scoped_read"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'resources'
  AND (
    public.is_eleva_ops()
    OR (
      -- Path-encoded athlete: development-tracker/<athlete_id>/...
      split_part(name, '/', 1) = 'development-tracker'
      AND split_part(name, '/', 2) ~ '^[0-9a-f-]{36}$'
      AND public.user_has_athlete_access(
        auth.uid(),
        split_part(name, '/', 2)::uuid
      )
    )
  )
);
