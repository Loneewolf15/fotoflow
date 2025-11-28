-- Run this in your Supabase SQL Editor to fix CORS issues for the 'photos' bucket

-- 1. Ensure the 'photos' bucket exists and is public
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do update set public = true;

-- 2. Update CORS settings to allow localhost:3000
-- This is critical for the canvas to be able to read the image data
update storage.buckets
set allowed_origins = ARRAY['http://localhost:3000', 'http://fotoflow-m5ga.vercel.app']
where id = 'photos';

-- 3. Verify the configuration
select id, name, public, allowed_origins from storage.buckets where id = 'photos';
