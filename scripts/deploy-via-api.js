#!/usr/bin/env node

const fs = require('fs')
const https = require('https')

// Read config from .env.local
const envContent = fs.readFileSync('/home/ubuntu/apps/wsystem-1/apps/web/.env.local', 'utf8')

let supabaseUrl = ''
let supabaseKey = ''

for (const line of envContent.split('\n')) {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
    supabaseUrl = line.split('=')[1]
  }
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
    supabaseKey = line.split('=')[1]
  }
}

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

console.log('✅ Supabase URL:', supabaseUrl)
console.log('✅ Using Service Role Key\n')

// Combine migrations
const migrations = [
  '/home/ubuntu/apps/wsystem-1/supabase/migrations/202604220001_allowance_types.sql',
  '/home/ubuntu/apps/wsystem-1/supabase/migrations/202604220002_employee_allowances.sql',
  '/home/ubuntu/apps/wsystem-1/supabase/migrations/202604220003_thr_configs.sql',
  '/home/ubuntu/apps/wsystem-1/supabase/migrations/202604220004_pro_rate_configs.sql',
  '/home/ubuntu/apps/wsystem-1/supabase/migrations/202604220005_allowance_calculation_logs.sql',
  '/home/ubuntu/apps/wsystem-1/supabase/migrations/202604220006_payroll_slips_extend.sql'
]

let combinedSQL = ''
migrations.forEach(file => {
  const sql = fs.readFileSync(file, 'utf8')
  combinedSQL += sql + '\n'
  console.log('📄 Loaded:', file.split('/').pop())
})

console.log(`\n📝 Total SQL: ${combinedSQL.length} characters\n`)

// Deploy via Supabase Edge Function (rpc endpoint)
// Note: Direct SQL execution via REST API requires creating an Edge Function
// For now, we'll provide instructions for manual deployment

console.log('⚠️  Direct SQL execution via REST API requires Supabase Edge Function setup.\n')
console.log('📋 MANUAL DEPLOYMENT INSTRUCTIONS:\n')
console.log('1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/kcbtehpcdltvdijgsrsb')
console.log('2. Navigate to: SQL Editor')
console.log('3. Click "New Query"')
console.log('4. Copy and paste the combined SQL from: /tmp/payroll-deploy.sql')
console.log('5. Click "Run"\n')

// Save combined SQL for easy copy
fs.writeFileSync('/tmp/payroll-deploy-ready.sql', combinedSQL)
console.log('✅ Combined SQL saved to: /tmp/payroll-deploy-ready.sql\n')

console.log('Alternative: Use Supabase CLI')
console.log('  cd /home/ubuntu/apps/wsystem-1/supabase')
console.log('  supabase link --project-ref kcbtehpcdltvdijgsrsb')
console.log('  supabase db push\n')
