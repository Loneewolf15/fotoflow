-- FIX FOR "Bucket not found" ERROR

-- 1. Create the 'photos' bucket explicitly
-- This handles the case where the bucket was never created
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do update set public = true;

-- 2. Update CORS settings (re-applying to be sure)
-- This ensures your local app and Vercel app can access it
update storage.buckets
set allowed_origins = ARRAY['http://localhost:3000', 'https://fotoflow.vercel.app', 'http://fotoflow-m5ga.vercel.app']
where id = 'photos';

-- 3. Verify the bucket exists
select id, name, public, allowed_origins from storage.buckets where id = 'photos';
