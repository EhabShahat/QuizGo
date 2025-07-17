const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration(filename) {
  try {
    console.log(`Running migration: ${filename}`);
    
    const sqlPath = path.join(__dirname, 'migrations', filename);
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error(`Error in ${filename}:`, error);
      return false;
    }
    
    console.log(`✅ Successfully ran ${filename}`);
    return true;
  } catch (error) {
    console.error(`Failed to run ${filename}:`, error.message);
    return false;
  }
}

async function runAllMigrations() {
  console.log('Starting database migrations...\n');
  
  const migrations = [
    '001_initial_schema.sql',
    '002_indexes.sql',
    '003_rls_policies.sql'
  ];
  
  for (const migration of migrations) {
    const success = await runMigration(migration);
    if (!success) {
      console.error('\n❌ Migration failed. Stopping.');
      process.exit(1);
    }
  }
  
  console.log('\n🎉 All migrations completed successfully!');
}

// Create the exec_sql function in Supabase if it doesn't exist
async function createExecSqlFunction() {
  const functionSql = `
    CREATE OR REPLACE FUNCTION exec_sql(sql_query text)
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      EXECUTE sql_query;
    END;
    $$;
  `;
  
  try {
    const { error } = await supabase.rpc('exec_sql', { sql_query: functionSql });
    if (error && !error.message.includes('already exists')) {
      // Try direct SQL execution for the function creation
      console.log('Creating exec_sql function...');
    }
  } catch (error) {
    console.log('Note: You may need to create the exec_sql function manually in Supabase SQL Editor');
  }
}

async function main() {
  await createExecSqlFunction();
  await runAllMigrations();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { runAllMigrations };