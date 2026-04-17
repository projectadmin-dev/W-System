const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://kcbtehpcdltvdijgsrsb.supabase.co'
const supabaseKey = 'sb_publishable_1eUIEcgJ4RYae6bdYN7Y7Q_8GBzwwxr'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testConnection() {
  console.log('🔍 Testing Supabase connection...')
  console.log(`URL: ${supabaseUrl}`)
  
  try {
    // Test by trying to fetch from any table (will fail gracefully if no tables)
    const { data, error } = await supabase.from('test_connection').select('*').limit(1)
    
    if (error) {
      if (error.code === '42P01') {
        // Table doesn't exist, but connection works!
        console.log('\n✅ SUCCESS: Connected to Supabase!')
        console.log('   Database is reachable, tables just need to be created')
        console.log(`   Error (expected): ${error.message}`)
      } else {
        console.log('\n❌ FAILED: Connection error')
        console.log(`   Error: ${error.message}`)
      }
    } else {
      console.log('\n✅ SUCCESS: Connected to Supabase!')
      console.log('   Database is working perfectly')
    }
  } catch (err) {
    console.log('\n❌ FAILED: Connection failed')
    console.log(`   Error: ${err.message}`)
  }
}

testConnection()
