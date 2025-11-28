-- It seems your 'buckets' table is missing the 'allowed_origins' column.
-- We will try to add it manually. If your Supabase Storage version supports it, this will work.

-- 1. Add the column if it doesn't exist
alter table storage.buckets 
add column if not exists allowed_origins text[];

-- 2. Update the CORS settings
-- Including localhost and your Vercel domains
update storage.buckets
set allowed_origins = ARRAY['http://localhost:3000', 'https://fotoflow.vercel.app', 'http://fotoflow-m5ga.vercel.app']
where id = 'photos';

-- 3. Verify
select id, name, allowed_origins from storage.buckets where id = 'photos';
