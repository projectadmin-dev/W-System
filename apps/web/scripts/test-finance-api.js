#!/usr/bin/env node
/**
 * Finance Module API Test Script
 * Tests all finance endpoints with service role key authentication
 * Run from: /home/ubuntu/apps/wsystem-1
 */

const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjYnRlaHBjZGx0dmRpamdzcnNiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTIzNDU2MCwiZXhwIjoyMDYwODEwNTYwfQ.example';
const BASE_URL = 'http://localhost:3001';

const headers = {
  'Content-Type': 'application/json',
  'apikey': SERVICE_ROLE_KEY,
  'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
  'X-Supabase-Service-Role': 'true'
};

async function testEndpoint(method, path, body = null, description) {
  const url = `${BASE_URL}${path}`;
  const options = {
    method,
    headers,
  };
  if (body) options.body = JSON.stringify(body);
  
  try {
    const response = await fetch(url, options);
    const data = await response.json();
    const status = response.status;
    const pass = status >= 200 && status < 300;
    
    console.log(`\n${pass ? '✅' : '❌'} ${description}`);
    console.log(`   ${method} ${path} → ${status}`);
    if (!pass || process.env.VERBOSE) {
      console.log(`   Response: ${JSON.stringify(data).slice(0, 200)}${JSON.stringify(data).length > 200 ? '...' : ''}`);
    }
    return { pass, status, data };
  } catch (error) {
    console.log(`\n❌ ${description}`);
    console.log(`   ${method} ${path} → ERROR: ${error.message}`);
    return { pass: false, error: error.message };
  }
}

async function runTests() {
  console.log('🧪 Finance Module API Tests');
  console.log('='.repeat(50));
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Service Role: ${SERVICE_ROLE_KEY.slice(0, 20)}...`);
  
  const results = { pass: 0, fail: 0 };
  
  // ========== COA ENDPOINTS ==========
  console.log('\n📊 COA (Chart of Accounts) Tests');
  console.log('-'.repeat(50));
  
  let r = await testEndpoint('GET', '/api/finance/coa', null, 'GET /api/finance/coa - List all COA accounts');
  r.pass ? results.pass++ : results.fail++;
  
  r = await testEndpoint('GET', '/api/finance/coa?tree=true', null, 'GET /api/finance/coa?tree=true - Get COA tree structure');
  r.pass ? results.pass++ : results.fail++;
  
  r = await testEndpoint('GET', '/api/finance/coa?type=asset', null, 'GET /api/finance/coa?type=asset - Filter by asset type');
  r.pass ? results.pass++ : results.fail++;
  
  if (r.data && r.data.length > 0) {
    const firstAccount = r.data[0];
    r = await testEndpoint('GET', `/api/finance/coa?id=${firstAccount.id}`, null, `GET /api/finance/coa?id=${firstAccount.id} - Get single COA by ID`);
    r.pass ? results.pass++ : results.fail++;
    
    r = await testEndpoint('GET', `/api/finance/coa?code=${firstAccount.account_code}`, null, `GET /api/finance/coa?code=${firstAccount.account_code} - Get COA by code`);
    r.pass ? results.pass++ : results.fail++;
  }
  
  // Test create COA
  const newCoaBody = {
    account_code: `TEST-${Date.now()}`,
    account_name: 'Test Account',
    account_type: 'asset',
    level: 1,
    normal_balance: 'debit'
  };
  r = await testEndpoint('POST', '/api/finance/coa', newCoaBody, 'POST /api/finance/coa - Create new COA account');
  r.pass ? results.pass++ : results.fail++;
  let createdCoaId = r.data?.id;
  
  if (createdCoaId) {
    // Test update COA
    r = await testEndpoint('PUT', `/api/finance/coa?id=${createdCoaId}`, { account_name: 'Updated Test Account' }, `PUT /api/finance/coa?id=${createdCoaId} - Update COA`);
    r.pass ? results.pass++ : results.fail++;
    
    // Test delete COA
    r = await testEndpoint('DELETE', `/api/finance/coa?id=${createdCoaId}`, null, `DELETE /api/finance/coa?id=${createdCoaId} - Delete COA`);
    r.pass ? results.pass++ : results.fail++;
  }
  
  // ========== FISCAL PERIODS ENDPOINTS ==========
  console.log('\n📅 Fiscal Periods Tests');
  console.log('-'.repeat(50));
  
  r = await testEndpoint('GET', '/api/finance/periods', null, 'GET /api/finance/periods - List all fiscal periods');
  r.pass ? results.pass++ : results.fail++;
  
  r = await testEndpoint('GET', '/api/finance/periods?current=true', null, 'GET /api/finance/periods?current=true - Get current period');
  r.pass ? results.pass++ : results.fail++;
  
  // Test create fiscal period
  const today = new Date();
  const nextYear = new Date(today.getFullYear() + 1, 0, 1);
  const periodBody = {
    period_name: `Test Period ${today.getFullYear()}-01`,
    period_type: 'monthly', // Required: 'monthly', 'quarterly', or 'annual'
    start_date: today.toISOString().split('T')[0],
    end_date: nextYear.toISOString().split('T')[0],
    status: 'open',
    fiscal_year: today.getFullYear()
  };
  r = await testEndpoint('POST', '/api/finance/periods', periodBody, 'POST /api/finance/periods - Create fiscal period');
  r.pass ? results.pass++ : results.fail++;
  let createdPeriodId = r.data?.id;
  
  if (createdPeriodId) {
    r = await testEndpoint('GET', `/api/finance/periods?id=${createdPeriodId}`, null, `GET /api/finance/periods?id=${createdPeriodId} - Get period by ID`);
    r.pass ? results.pass++ : results.fail++;
    
    // Test update period
    r = await testEndpoint('PUT', `/api/finance/periods?id=${createdPeriodId}`, { period_name: 'Updated Period Name' }, `PUT /api/finance/periods?id=${createdPeriodId} - Update period`);
    r.pass ? results.pass++ : results.fail++;
    
    // Test delete period
    r = await testEndpoint('DELETE', `/api/finance/periods?id=${createdPeriodId}`, null, `DELETE /api/finance/periods?id=${createdPeriodId} - Delete period`);
    r.pass ? results.pass++ : results.fail++;
  }
  
  // ========== JOURNAL ENTRIES ENDPOINTS ==========
  console.log('\n📝 Journal Entries Tests');
  console.log('-'.repeat(50));
  
  r = await testEndpoint('GET', '/api/finance/journal', null, 'GET /api/finance/journal - List all journal entries');
  r.pass ? results.pass++ : results.fail++;
  
  // Note: Creating journal entries requires valid COA IDs and fiscal period IDs
  // This test will be skipped if no valid references exist
  console.log('\n⚠️  Journal entry creation test skipped (requires valid COA + fiscal period references)');
  console.log('   Manual testing recommended with proper seed data');
  
  // ========== SUMMARY ==========
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${results.pass}`);
  console.log(`❌ Failed: ${results.fail}`);
  console.log(`📈 Success Rate: ${results.pass / (results.pass + results.fail) * 100 | 0}%`);
  
  if (results.fail > 0) {
    console.log('\n⚠️  Some tests failed. Check the output above for details.');
    process.exit(1);
  } else {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
