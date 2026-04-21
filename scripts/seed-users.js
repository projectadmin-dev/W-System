#!/usr/bin/env node

/**
 * Seed script to create 50 sample users in Supabase
 * Run from: /home/ubuntu/apps/wsystem-1/
 */

const SUPABASE_URL = 'https://kcbtehpcdltvdijgsrsb.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjYnRlaHBjZGx0dmRpamdzcnNiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTAzNzQ4MywiZXhwIjoyMDYwNjEzNDgzfQ.dBqR6vX8JzKpQ8xT9XvN3L5yM2wZ4kF7pJ1qH8cR-WD4';

// Sample data generators
const firstNames = [
  'Ahmad', 'Budi', 'Citra', 'Dewi', 'Eko', 'Fajar', 'Gita', 'Hendra', 'Indah', 'Joko',
  'Kartika', 'Lestari', 'Muhammad', 'Nurul', 'Oki', 'Putri', 'Qori', 'Rudi', 'Siti', 'Tono',
  'Umar', 'Vina', 'Wawan', 'Xena', 'Yusuf', 'Zahra', 'Andi', 'Bella', 'Cahyo', 'Dina',
  'Erwin', 'Fitri', 'Gilang', 'Hana', 'Irfan', 'Jasmine', 'Kevin', 'Lina', 'Mario', 'Nadia',
  'Olivia', 'Panji', 'Ratna', 'Sandro', 'Tari', 'Usman', 'Via', 'Willy', 'Yanti', 'Zainal'
];

const lastNames = [
  'Wibowo', 'Saputra', 'Lestari', 'Putri', 'Santoso', 'Pratama', 'Wijaya', 'Kusuma', 'Hidayat', 'Rahman',
  'Setiawan', 'Purnama', 'Utami', 'Nugroho', 'Sari', 'Hartono', 'Susanto', 'Permata', 'Astuti', 'Firmansyah',
  'Siregar', 'Batubara', 'Nasution', 'Harahap', 'Daulay', 'Ginting', 'Sembiring', 'Tarigan', 'Sinaga', 'Simatupang',
  'Wahyudi', 'Kurniawan', 'Aditya', 'Mahendra', 'Pradana', 'Saputra', 'Wicaksana', 'Nugraha', 'Pangestu', 'Laksono',
  'Handoko', 'Surya', 'Mandala', 'Baskara', 'Candra', 'Dharma', 'Eka', 'Farida', 'Gunawan', 'Hamzah'
];

const departments = [
  'Technology', 'Finance', 'Human Resources', 'Marketing', 'Sales',
  'Operations', 'Customer Support', 'Product', 'Design', 'Legal'
];

const roles = [
  { id: '1', name: 'super_admin' },
  { id: '2', name: 'admin' },
  { id: '3', name: 'marketing' },
  { id: '4', name: 'commercial' },
  { id: '5', name: 'pm' },
  { id: '6', name: 'developer' },
  { id: '7', name: 'finance' },
  { id: '8', name: 'hr' }
];

function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateEmail(firstName, lastName, index) {
  const domains = ['wit.id', 'company.com', 'mail.id', 'corp.co.id'];
  const base = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
  const domain = randomElement(domains);
  return index < 10 ? `${base}@${domain}` : `${base}${index}@${domain}`;
}

function generatePhone() {
  const prefixes = ['081', '082', '083', '085', '087', '089'];
  const prefix = randomElement(prefixes);
  const suffix = Math.floor(10000000 + Math.random() * 90000000);
  return `${prefix}${suffix}`;
}

function generateUsers(count) {
  const users = [];
  const usedEmails = new Set();
  
  for (let i = 0; i < count; i++) {
    const firstName = randomElement(firstNames);
    const lastName = randomElement(lastNames);
    let email = generateEmail(firstName, lastName, i);
    
    // Ensure unique email
    let counter = 0;
    while (usedEmails.has(email) && counter < 100) {
      email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${counter}${i}@${randomElement(domains)}`;
      counter++;
    }
    usedEmails.add(email);
    
    const user = {
      full_name: `${firstName} ${lastName}`,
      email: email,
      role_id: randomElement(roles).id,
      department: randomElement(departments),
      phone: generatePhone(),
      is_active: Math.random() > 0.2, // 80% active users
      created_at: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString()
    };
    
    users.push(user);
  }
  
  return users;
}

async function seedUsers() {
  console.log('🌱 Generating 50 sample users...');
  const users = generateUsers(50);
  
  console.log('📤 Inserting users into Supabase...');
  
  const response = await fetch(`${SUPABASE_URL}/rest/v1/user_profiles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(users)
  });
  
  if (!response.ok) {
    const error = await response.text();
    console.error('❌ Error:', error);
    process.exit(1);
  }
  
  const result = await response.json();
  console.log(`✅ Successfully inserted ${result.length || users.length} users!`);
  console.log('\n📊 Sample users:');
  console.log(result?.slice(0, 5).map((u, i) => 
    `  ${i + 1}. ${u.full_name} (${u.email}) - ${u.department}`
  ).join('\n'));
  console.log(`\n💡 Total users in database: ${result?.length || 50}`);
}

seedUsers().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
