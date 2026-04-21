const https = require('https');

// Configuration - dari .env.local
const SUPABASE_URL = 'https://kcbtehpcdltvdijgsrsb.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjYnRlaHBjZGx0dmRpamdzcjZiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTAyNzQ1NywiZXhwIjoyMDYwNjAzNDU3fQ.BX8ZqJ4mK2nL5pR7sT9uV1wA3bC6dE8fG0hI2jK4lM6';

// Sample user data - 50 users
const sampleUsers = [
  ['Ahmad Superadmin', 'super_admin', 'IT'],
  ['Budi System', 'super_admin', 'IT'],
  ['Citra Administrator', 'admin', 'IT'],
  ['Dedi Admin', 'admin', 'Operations'],
  ['Eka Admin', 'admin', 'Finance'],
  ['Fani Marketing', 'marketing', 'Marketing'],
  ['Gilang Promo', 'marketing', 'Marketing'],
  ['Hana Campaign', 'marketing', 'Marketing'],
  ['Indra Social', 'marketing', 'Marketing'],
  ['Joko Digital', 'marketing', 'Marketing'],
  ['Kartika Lead', 'marketing_lead', 'Marketing'],
  ['Lukman Senior', 'marketing_lead', 'Marketing'],
  ['Maya Sales', 'commercial', 'Sales'],
  ['Nanda Business', 'commercial', 'Sales'],
  ['Oki Account', 'commercial', 'Sales'],
  ['Putri Client', 'commercial', 'Sales'],
  ['Qori Relation', 'commercial', 'Sales'],
  ['Rudi Director', 'commercial_director', 'Sales'],
  ['Siti Executive', 'commercial_director', 'Sales'],
  ['Tono Manager', 'pm', 'Project'],
  ['Umi Coordinator', 'pm', 'Project'],
  ['Vicky Scrum', 'pm', 'Project'],
  ['Wawan Agile', 'pm', 'Project'],
  ['Xena Delivery', 'pm', 'Project'],
  ['Yanto Senior', 'pm_lead', 'Project'],
  ['Zahra Head', 'pm_lead', 'Project'],
  ['Andi Backend', 'developer', 'Engineering'],
  ['Bella Frontend', 'developer', 'Engineering'],
  ['Cahyo Fullstack', 'developer', 'Engineering'],
  ['Dewi Mobile', 'developer', 'Engineering'],
  ['Edi DevOps', 'developer', 'Engineering'],
  ['Fitri QA', 'developer', 'Engineering'],
  ['Galih UI', 'developer', 'Engineering'],
  ['Hendra System', 'developer', 'Engineering'],
  ['Ika Software', 'developer', 'Engineering'],
  ['Jaya Code', 'developer', 'Engineering'],
  ['Kiki Accountant', 'finance', 'Finance'],
  ['Lina Tax', 'finance', 'Finance'],
  ['Mamat Billing', 'finance', 'Finance'],
  ['Nia Payroll', 'finance', 'Finance'],
  ['Opung Budget', 'finance', 'Finance'],
  ['Arie Anggono', 'cfo', 'Finance'],
  ['Ganjar HR', 'hr', 'Human Resources'],
  ['Ratna Recruiter', 'hr', 'Human Resources'],
  ['Sari People', 'hr', 'Human Resources'],
  ['Project Admin', 'ceo', 'Executive'],
  ['Client Alpha', 'client', 'External'],
  ['Client Beta', 'client', 'External'],
  ['Client Gamma', 'client', 'External'],
  ['Client Delta', 'client', 'External'],
];

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

async function getRoleId(roleName) {
  const options = {
    hostname: 'kcbtehpcdltvdijgsrsb.supabase.co',
    path: `/rest/v1/roles?name=eq.${roleName}&select=id`,
    method: 'GET',
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Prefer': 'return=representation'
    }
  };
  
  const res = await request(options);
  if (res.status === 200 && Array.isArray(res.data) && res.data.length > 0) {
    return res.data[0].id;
  }
  return null;
}

async function getTenantId() {
  const options = {
    hostname: 'kcbtehpcdltvdijgsrsb.supabase.co',
    path: '/rest/v1/tenants?select=id&limit=1',
    method: 'GET',
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Prefer': 'return=representation'
    }
  };
  
  const res = await request(options);
  if (res.status === 200 && Array.isArray(res.data) && res.data.length > 0) {
    return res.data[0].id;
  }
  return null;
}

async function createUser(idx, name, role, dept) {
  const email = name.toLowerCase().replace(/\s+/g, '.') + idx + '@wit.id';
  
  // Create via Admin API
  const adminOptions = {
    hostname: 'kcbtehpcdltvdijgsrsb.supabase.co',
    path: '/admin/v1/users',
    method: 'POST',
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    }
  };
  
  const authRes = await request(adminOptions, {
    email: email,
    password: 'Password123!',
    email_confirm: true,
    user_metadata: { full_name: name }
  });
  
  if (authRes.status !== 201 || !authRes.data.id) {
    return { success: false, error: authRes.data.msg || 'Auth creation failed' };
  }
  
  const userId = authRes.data.id;
  
  // Get role_id from cache or fetch
  const roleId = await getRoleId(role);
  if (!roleId) {
    return { success: false, error: `Role ${role} not found` };
  }
  
  // Get tenant_id
  const tenantId = await getTenantId();
  if (!tenantId) {
    return { success: false, error: 'No tenant found' };
  }
  
  // Insert into user_profiles
  const profileOptions = {
    hostname: 'kcbtehpcdltvdijgsrsb.supabase.co',
    path: '/rest/v1/user_profiles',
    method: 'POST',
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    }
  };
  
  const profileRes = await request(profileOptions, {
    id: userId,
    tenant_id: tenantId,
    full_name: name,
    email: email,
    role_id: roleId,
    department: dept,
    phone: `+62 812-${String(idx * 1000).padStart(4, '0')}-${String(idx * 7).padStart(4, '0')}`,
    timezone: 'Asia/Jakarta',
    language: 'id',
    is_active: true
  });
  
  if (profileRes.status >= 200 && profileRes.status < 300) {
    return { success: true, email };
  }
  
  return { success: false, error: profileRes.data.message || 'Profile creation failed' };
}

async function main() {
  console.log('🚀 Starting sample user creation...\n');
  
  const tenantId = await getTenantId();
  if (!tenantId) {
    console.error('❌ No tenant found. Please create a tenant first.');
    return;
  }
  console.log(`✅ Found tenant: ${tenantId}\n`);
  
  let successCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < sampleUsers.length; i++) {
    const [name, role, dept] = sampleUsers[i];
    const idx = i + 1;
    
    const result = await createUser(idx, name, role, dept);
    
    if (result.success) {
      console.log(`✅ [${idx}] ${name} (${role}) - ${result.email}`);
      successCount++;
    } else {
      console.error(`❌ [${idx}] ${name}: ${result.error}`);
      failCount++;
    }
    
    // Delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`📊 Summary: ${successCount} created, ${failCount} failed`);
  console.log(`🔑 Default password for all users: Password123!`);
  console.log('='.repeat(50));
}

main().catch(console.error);
