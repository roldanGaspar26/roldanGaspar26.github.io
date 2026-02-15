-- Migration Script for Authentication Support
-- Run this in your Supabase SQL Editor
-- This updates the task_state table to support per-user data storage

-- Step 1: Add user_id column (if table already exists)
-- If you're creating a new table, skip to the CREATE TABLE statement below
ALTER TABLE task_state 
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 2: Remove old primary key constraint (if exists)
ALTER TABLE task_state DROP CONSTRAINT IF EXISTS task_state_pkey;

-- Step 3: If you have existing data with 'id' column, you may want to migrate it
-- Otherwise, you can drop the old 'id' column:
-- ALTER TABLE task_state DROP COLUMN IF EXISTS id;

-- Step 4: Create new primary key on user_id
ALTER TABLE task_state 
  ADD PRIMARY KEY (user_id);

-- Step 5: Enable Row Level Security (REQUIRED for authentication)
ALTER TABLE task_state ENABLE ROW LEVEL SECURITY;

-- Step 6: Drop old policies if they exist
DROP POLICY IF EXISTS "Users can read own data" ON task_state;
DROP POLICY IF EXISTS "Users can insert own data" ON task_state;
DROP POLICY IF EXISTS "Users can update own data" ON task_state;
DROP POLICY IF EXISTS "Allow public read" ON task_state;
DROP POLICY IF EXISTS "Allow public write" ON task_state;
DROP POLICY IF EXISTS "Allow public update" ON task_state;

-- Step 7: Create new RLS policies for authenticated users only
CREATE POLICY "Users can read own data" 
  ON task_state FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own data" 
  ON task_state FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own data" 
  ON task_state FOR UPDATE 
  USING (auth.uid() = user_id);

-- Alternative: If creating a new table from scratch, use this instead:
/*
CREATE TABLE task_state (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tasks JSONB DEFAULT '[]'::jsonb,
  archived_tasks JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE task_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own data" 
  ON task_state FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own data" 
  ON task_state FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own data" 
  ON task_state FOR UPDATE 
  USING (auth.uid() = user_id);
*/
