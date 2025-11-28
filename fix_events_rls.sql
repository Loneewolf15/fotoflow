-- Fix RLS Policies for 'events' table
-- This ensures you can update your own events and guests can view them.

-- 1. Enable RLS (just in case)
alter table events enable row level security;

-- 2. Drop existing policies to avoid conflicts/duplicates
drop policy if exists "Public events are viewable by everyone" on events;
drop policy if exists "Users can insert their own events" on events;
drop policy if exists "Users can update their own events" on events;
drop policy if exists "Users can delete their own events" on events;
drop policy if exists "Enable read access for all users" on events;
drop policy if exists "Enable insert for authenticated users only" on events;
drop policy if exists "Enable update for users based on email" on events;
drop policy if exists "Enable delete for users based on user_id" on events;

-- 3. Create new, correct policies

-- READ: Allow everyone to see events (needed for Guest View)
create policy "Public events are viewable by everyone"
on events for select
using ( true );

-- INSERT: Allow authenticated users to create events (must own them)
create policy "Users can insert their own events"
on events for insert
with check ( auth.uid() = owner_id );

-- UPDATE: Allow users to update ONLY their own events
create policy "Users can update their own events"
on events for update
using ( auth.uid() = owner_id );

-- DELETE: Allow users to delete ONLY their own events
create policy "Users can delete their own events"
on events for delete
using ( auth.uid() = owner_id );
