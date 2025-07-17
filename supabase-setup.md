# Supabase Setup Guide

## Install Supabase CLI
```bash
# Using npm
npm install -g supabase

# Using homebrew (macOS)
brew install supabase/tap/supabase
```

## Initialize Supabase in your project
```bash
# Run from project root
supabase init

# Link to your remote project
supabase link --project-ref your-project-ref
```

## Run migrations
```bash
# Apply migrations to your remote database
supabase db push

# Or apply them locally for development
supabase start
supabase db reset
```

## Alternative: Manual SQL execution
If you prefer to run the SQL manually:

1. Copy content from `database/migrations/001_initial_schema.sql`
2. Go to Supabase Dashboard → SQL Editor
3. Paste and run the SQL
4. Repeat for `002_indexes.sql` and `003_rls_policies.sql`