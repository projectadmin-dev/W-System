#!/usr/bin/env node

/**
 * Deploy Payroll Migrations to Supabase
 * 
 * Usage: node scripts/deploy-payroll-migrations.js
 */

const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

async function main() {
  console.log('🚀 Deploying Payroll Migrations to Supabase...\n')
  
  // Read DATABASE_URL from .env.local
  const envPath = path.join(__dirname, '../apps/web/.env.local')
  const envContent = fs.readFileSync(envPath, 'utf8')
  
  let databaseUrl = ''
  for (const line of envContent.split('\n')) {
    if (line.startsWith('DATABASE_URL=')) {
      databaseUrl = line.split('=')[1]
      break
    }
  }
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not found in .env.local')
    process.exit(1)
  }
  
  console.log('✅ Found DATABASE_URL')
  
  // Combine all migration files
  const migrationsDir = path.join(__dirname, '../supabase/migrations')
  const migrationFiles = [
    '202604220001_allowance_types.sql',
    '202604220002_employee_allowances.sql',
    '202604220003_thr_configs.sql',
    '202604220004_pro_rate_configs.sql',
    '202604220005_allowance_calculation_logs.sql',
    '202604220006_payroll_slips_extend.sql'
  ]
  
  let combinedSQL = ''
  for (const file of migrationFiles) {
    const filePath = path.join(migrationsDir, file)
    const sql = fs.readFileSync(filePath, 'utf8')
    combinedSQL += `\n-- ${file}\n${sql}\n`
    console.log(`📄 Loaded: ${file}`)
  }
  
  console.log(`\n📝 Total SQL: ${combinedSQL.split('\n').length} lines\n`)
  
  // Connect to Supabase
  console.log('🔗 Connecting to Supabase...')
  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  })
  
  try {
    await client.connect()
    console.log('✅ Connected to Supabase\n')
    
    // Execute migrations
    console.log('⚙️  Executing migrations...\n')
    await client.query('BEGIN')
    
    const statements = combinedSQL.split(';').filter(s => s.trim().length > 0)
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim()
      if (statement.length === 0 || statement.startsWith('--')) continue
      
      try {
        await client.query(statement + ';')
        if (i % 10 === 0) {
          console.log(`   Executed ${i}/${statements.length} statements...`)
        }
      } catch (err) {
        console.error(`❌ Error at statement ${i}:`, err.message)
        console.error('SQL:', statement.substring(0, 200))
        throw err
      }
    }
    
    await client.query('COMMIT')
    console.log('\n✅ Migrations executed successfully!\n')
    
    // Verify tables created
    console.log('🔍 Verifying tables...\n')
    const tablesToCheck = [
      'allowance_types',
      'employee_allowances',
      'thr_configs',
      'hr_thr_settings',
      'hr_thr_eligibilities',
      'pro_rate_configs',
      'allowance_calculation_logs'
    ]
    
    for (const table of tablesToCheck) {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        ) as exists
      `, [table])
      
      if (result.rows[0].exists) {
        console.log(`✅ Table created: ${table}`)
      } else {
        console.log(`⚠️  Table not found: ${table}`)
      }
    }
    
    console.log('\n✅ Deployment complete!\n')
    
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('\n❌ Migration failed:', error.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

main()
