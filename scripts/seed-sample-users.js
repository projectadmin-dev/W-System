const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Configuration
const SUPABASE_URL = 'https://kcbtehpcdltvdijgsrsb.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjYnRlaHBjZGx0dmRpamdzcjYiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTc0NTAyNzQ1NywiZXhwIjoyMDYwNjAzNDU3fQ.qhWg7rT8N9F5vZ3xJ2yK4mL6pR8sU0wA1bC3dE5fG7H';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Sample user data - 50 users dengan berbagai role
const sampleUsers = [
  // Super Admin (2)
  { name: 'Ahmad Superadmin', role: 'super_admin', dept: 'IT' },
  { name: 'Budi System', role: 'super_admin', dept: 'IT' },
  // Admin (3)
  { name: 'Citra Administrator', role: 'admin', dept: 'IT' },
  { name: 'Dedi Admin', role: 'admin', dept: 'Operations' },
  { name: 'Eka Admin', role: 'admin', dept: 'Finance' },
  // Marketing (5)
  { name: 'Fani Marketing', role: 'marketing', dept: 'Marketing' },
  { name: 'Gilang Promo', role: 'marketing', dept: 'Marketing' },
  { name: 'Hana Campaign', role: 'marketing', dept: 'Marketing' },
  { name: 'Indra Social', role: 'marketing', dept: 'Marketing' },
  { name: 'Joko Digital', role: 'marketing', dept: 'Marketing' },
  // Marketing Lead (2)
  { name: 'Kartika Lead', role: 'marketing_lead', dept: 'Marketing' },
  { name: 'Lukman Senior', role: 'marketing_lead', dept: 'Marketing' },
  // Commercial (5)
  { name: 'Maya Sales', role: 'commercial', dept: 'Sales' },
  { name: 'Nanda Business', role: 'commercial', dept: 'Sales' },
  { name: 'Oki Account', role: 'commercial', dept: 'Sales' },
  { name: 'Putri Client', role: 'commercial', dept: 'Sales' },
  { name: 'Qori Relation', role: 'commercial', dept: 'Sales' },
  // Commercial Director (2)
  { name: 'Rudi Director', role: 'commercial_director', dept: 'Sales' },
  { name: 'Siti Executive', role: 'commercial_director', dept: 'Sales' },
  // Project Manager (5)
  { name: 'Tono Manager', role: 'pm', dept: 'Project' },
  { name: 'Umi Coordinator', role: 'pm', dept: 'Project' },
  { name: 'Vicky Scrum', role: 'pm', dept: 'Project' },
  { name: 'Wawan Agile', role: 'pm', dept: 'Project' },
  { name: 'Xena Delivery', role: 'pm', dept: 'Project' },
  // PM Lead (2)
  { name: 'Yanto Senior', role: 'pm_lead', dept: 'Project' },
  { name: 'Zahra Head', role: 'pm_lead', dept: 'Project' },
  // Developer (10)
  { name: 'Andi Backend', role: 'developer', dept: 'Engineering' },
  { name: 'Bella Frontend', role: 'developer', dept: 'Engineering' },
  { name: 'Cahyo Fullstack', role: 'developer', dept: 'Engineering' },
  { name: 'Dewi Mobile', role: 'developer', dept: 'Engineering' },
  { name: 'Edi DevOps', role: 'developer', dept: 'Engineering' },
  { name: 'Fitri QA', role: 'developer', dept: 'Engineering' },
  { name: 'Galih UI', role: 'developer', dept: 'Engineering' },
  { name: 'Hendra System', role: 'developer', dept: 'Engineering' },
  { name: 'Ika Software', role: 'developer', dept: 'Engineering' },
  { name: 'Jaya Code', role: 'developer', dept: 'Engineering' },
  // Finance (5)
  { name: 'Kiki Accountant', role: 'finance', dept: 'Finance' },
  { name: 'Lina Tax', role: 'finance', dept: 'Finance' },
  { name: 'Mamat Billing', role: 'finance', dept: 'Finance' },
  { name: 'Nia Payroll', role: 'finance', dept: 'Finance' },
  { name: 'Opung Budget', role: 'finance', dept: 'Finance' },
  // CFO (1)
  { name: 'Arie Anggono', role: 'cfo', dept: 'Finance' },
  // HR (3)
  { name: 'Ganjar HR', role: 'hr', dept: 'Human Resources' },
  { name: 'Ratna Recruiter', role: 'hr', dept: 'Human Resources' },
  { name: 'Sari People', role: 'hr', dept: 'Human Resources' },
  // CEO (1)
  { name: 'Project Admin', role: 'ceo', dept: 'Executive' },
  // Client (4)
  { name: 'Client Alpha', role: 'client', dept: 'External' },
  { name: 'Client Beta', role: 'client', dept: 'External' },
  { name: 'Client Gamma', role: 'client', dept: 'External' },
  { name: 'Client Delta', role: 'client', dept: 'External' },
];

async function generateEmail(name, idx) {
  const cleanName = name.toLowerCase().replace(/\s+/g, '.');
  return `${cleanName}${idx}@wit.id`;
}

async function getRoleId(roleName) {
  const { data, error } = await supabase
    .from('roles')
    .select('id')
    .eq('name', roleName)
    .single();
  
  if (error || !data) {
    console.error(`Error getting role ${roleName}:`, error);
    return null;
  }
  return data.id;
}

async function getTenantId() {
  const { data, error } = await supabase
    .from('tenants')
    .select('id')
    .limit(1)
    .single();
  
  if (error || !data) {
    console.error('Error getting tenant:', error);
    return null;
  }
  return data.id;
}

async function createUser(userData, idx) {
  const email = await generateEmail(userData.name, idx);
  const password = 'Password123!';
  
  // Hash password using bcrypt (Supabase uses bcrypt)
  // Note: For service role, we can insert directly into auth.users
  const { data: authData, error: authError } = await supabase.rpc('create_user', {
    email: email,
    password: password,
    full_name: userData.name
  });
  
  if (authError) {
    console.error(`Error creating auth user ${email}:`, authError.message);
    // Try direct insert as fallback
    return null;
  }
  
  return authData;
}

async function main() {
  console.log('🚀 Starting sample user creation...\n');
  
  // Get role mappings
  const roleIds = {};
  const roles = ['super_admin', 'admin', 'marketing', 'marketing_lead', 'commercial', 
                 'commercial_director', 'pm', 'pm_lead', 'developer', 'finance', 
                 'cfo', 'ceo', 'hr', 'client'];
  
  for (const role of roles) {
    roleIds[role] = await getRoleId(role);
  }
  
  const tenantId = await getTenantId();
  
  if (!tenantId) {
    console.error('❌ No tenant found. Please create a tenant first.');
    return;
  }
  
  console.log(`✅ Found tenant: ${tenantId}`);
  console.log(`✅ Role mappings: ${JSON.stringify(roleIds, null, 2)}\n`);
  
  let successCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < sampleUsers.length; i++) {
    const user = sampleUsers[i];
    const idx = i + 1;
    const email = await generateEmail(user.name, idx);
    const roleId = roleIds[user.role];
    
    if (!roleId) {
      console.error(`❌ [${idx}] ${user.name}: Role ${user.role} not found`);
      failCount++;
      continue;
    }
    
    try {
      // Create user via Supabase Admin API
      const response = await fetch(`${SUPABASE_URL}/admin/v1/users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_ROLE_KEY
        },
        body: JSON.stringify({
          email: email,
          password: 'Password123!',
          email_confirm: true,
          user_metadata: {
            full_name: user.name
          }
        })
      });
      
      const authUser = await response.json();
      
      if (response.ok && authUser.id) {
        // Insert into user_profiles
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            id: authUser.id,
            tenant_id: tenantId,
            full_name: user.name,
            email: email,
            role_id: roleId,
            department: user.dept,
            phone: `+62 812-${String(idx * 1000).padStart(4, '0')}-${String(idx * 7).padStart(4, '0')}`,
            timezone: 'Asia/Jakarta',
            language: 'id',
            is_active: true
          });
        
        if (profileError) {
          console.error(`❌ [${idx}] ${user.name}: Profile insert failed - ${profileError.message}`);
          failCount++;
        } else {
          console.log(`✅ [${idx}] ${user.name} (${user.role}) - ${email}`);
          successCount++;
        }
      } else {
        console.error(`❌ [${idx}] ${user.name}: Auth creation failed - ${authUser.msg || 'Unknown error'}`);
        failCount++;
      }
    } catch (err) {
      console.error(`❌ [${idx}] ${user.name}: ${err.message}`);
      failCount++;
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`📊 Summary: ${successCount} created, ${failCount} failed`);
  console.log(`🔑 Default password for all users: Password123!`);
  console.log('='.repeat(50));
}

main().catch(console.error);
