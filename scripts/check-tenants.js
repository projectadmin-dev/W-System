const https = require('https');

const SUPABASE_URL = 'https://kcbtehpcdltvdijgsrsb.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjYnRlaHBjZGx0dmRpamdzcjZiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTAyNzQ1NywiZXhwIjoyMDYwNjAzNDU3fQ.BX8ZqJ4mK2nL5pR7sT9uV1wA3bC6dE8fG0hI2jK4lM6';

function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function checkTenants() {
  const options = {
    hostname: 'kcbtehpcdltvdijgsrsb.supabase.co',
    path: '/rest/v1/tenants?select=id,name&limit=5',
    method: 'GET',
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
    }
  };
  
  const res = await request(options);
  console.log('Tenants response:', res.status, res.data);
  return res;
}

async function createTenantIfNotExists() {
  // First check if any tenant exists
  const checkRes = await checkTenants();
  
  if (checkRes.status === 200 && Array.isArray(checkRes.data) && checkRes.data.length > 0) {
    console.log('✅ Tenant already exists:', checkRes.data[0]);
    return checkRes.data[0].id;
  }
  
  // Create default tenant
  const options = {
    hostname: 'kcbtehpcdltvdijgsrsb.supabase.co',
    path: '/rest/v1/tenants',
    method: 'POST',
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    }
  };
  
  const tenantData = {
    name: 'WIT.ID Default',
    slug: 'wit-default',
    is_active: true,
    settings: {}
  };
  
  const createRes = await request(options, tenantData);
  console.log('Create tenant response:', createRes.status, createRes.data);
  
  if (createRes.status >= 200 && createRes.status < 300) {
    const tenant = Array.isArray(createRes.data) ? createRes.data[0] : createRes.data;
    console.log('✅ Created tenant:', tenant);
    return tenant.id;
  }
  
  return null;
}

async function main() {
  console.log('🔍 Checking tenants...\n');
  const tenantId = await createTenantIfNotExists();
  
  if (tenantId) {
    console.log(`\n✅ Ready to use tenant: ${tenantId}`);
  } else {
    console.log('\n❌ Failed to get/create tenant');
  }
}

main().catch(console.error);
