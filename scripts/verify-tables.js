const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://kcbtehpcdltvdijgsrsb.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseKey) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function verifyTables() {
  console.log('🔍 Verifying payroll tables...\n')
  
  const tables = [
    'payroll_periods',
    'payroll_slips',
    'payroll_slip_details',
    'allowance_types',
    'employee_allowances',
    'thr_configs',
    'hr_thr_settings',
    'hr_thr_eligibilities',
    'pro_rate_configs',
    'allowance_calculation_logs'
  ]
  
  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
      
      if (error) {
        if (error.message.includes('relation') && error.message.includes('does not exist')) {
          console.log(`❌ ${table}: NOT FOUND`)
        } else {
          console.log(`⚠️  ${table}: Error - ${error.message}`)
        }
      } else {
        console.log(`✅ ${table}: EXISTS (${count || 0} rows)`)
      }
    } catch (error) {
      console.log(`❌ ${table}: ${error.message}`)
    }
  }
  
  console.log('\n✅ Verification complete!')
}

verifyTables()
