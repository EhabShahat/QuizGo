# Manual Database Migration Guide

Since we're using Supabase, we need to run our SQL migrations manually through the Supabase dashboard.

## Step 1: Access Supabase SQL Editor

1. Go to your Supabase dashboard
2. Select your project
3. Click on **"SQL Editor"** in the left sidebar

## Step 2: Run Migrations in Order

Copy and paste each migration file content into the SQL editor and run them:

### Migration 1: Initial Schema
```sql
-- Copy content from: database/migrations/001_initial_schema.sql
-- Paste and run in Supabase SQL Editor
```

### Migration 2: Indexes
```sql
-- Copy content from: database/migrations/002_indexes.sql
-- Paste and run in Supabase SQL Editor
```

### Migration 3: RLS Policies
```sql
-- Copy content from: database/migrations/003_rls_policies.sql
-- Paste and run in Supabase SQL Editor
```

### Migration 4: Realtime Game Tables
```sql
-- Copy content from: database/migrations/004_realtime_game_tables.sql
-- Paste and run in Supabase SQL Editor
```

## Step 3: Enable Realtime

1. In Supabase dashboard, go to **"Database"** → **"Replication"**
2. Enable realtime for these tables:
   - `game_sessions`
   - `game_players`
   - `game_events`
   - `player_answers`

## Step 4: Test Database Connection

Run this query in SQL Editor to test:

```sql
SELECT 'Database setup complete!' as status;
```

If it runs without errors, your database is ready!