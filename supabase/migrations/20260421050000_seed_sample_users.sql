-- Seed 50 sample users for testing
-- Migration: 20260421050000_seed_sample_users.sql

-- Get the authenticated role ID once using CTE
WITH auth_role AS (
  SELECT id FROM auth.roles WHERE role_name = 'authenticated' LIMIT 1
)
INSERT INTO public.user_profiles (full_name, email, role_id, department, phone, is_active, created_at, updated_at)
SELECT * FROM (
  VALUES 
    ('Ahmad Wibowo', 'ahmad.wibowo@wit.id', 'Technology', '081234567890'),
    ('Budi Saputra', 'budi.saputra@wit.id', 'Technology', '081234567891'),
    ('Citra Lestari', 'citra.lestari@wit.id', 'Finance', '081234567892'),
    ('Dewi Putri', 'dewi.putri@wit.id', 'Human Resources', '081234567893'),
    ('Eko Santoso', 'eko.santoso@wit.id', 'Technology', '081234567894'),
    ('Fajar Pratama', 'fajar.pratama@wit.id', 'Marketing', '081234567895'),
    ('Gita Wijaya', 'gita.wijaya@wit.id', 'Marketing', '081234567896'),
    ('Hendra Kusuma', 'hendra.kusuma@wit.id', 'Sales', '081234567897'),
    ('Indah Hidayat', 'indah.hidayat@wit.id', 'Product', '081234567898'),
    ('Joko Rahman', 'joko.rahman@wit.id', 'Technology', '081234567899'),
    ('Kartika Setiawan', 'kartika.setiawan@wit.id', 'Finance', '081234567900'),
    ('Lestari Purnama', 'lestari.purnama@wit.id', 'Human Resources', '081234567901'),
    ('Muhammad Utami', 'muhammad.utami@wit.id', 'Technology', '081234567902'),
    ('Nurul Nugroho', 'nurul.nugroho@wit.id', 'Marketing', '081234567903'),
    ('Oki Sari', 'oki.sari@wit.id', 'Sales', '081234567904'),
    ('Putri Hartono', 'putri.hartono@wit.id', 'Product', '081234567905'),
    ('Qori Susanto', 'qori.susanto@wit.id', 'Technology', '081234567906'),
    ('Rudi Permata', 'rudi.permata@wit.id', 'Finance', '081234567907'),
    ('Siti Astuti', 'siti.astuti@wit.id', 'Human Resources', '081234567908'),
    ('Tono Firmansyah', 'tono.firmansyah@wit.id', 'Technology', '081234567909'),
    ('Umar Siregar', 'umar.siregar@wit.id', 'Technology', '081234567910'),
    ('Vina Batubara', 'vina.batubara@wit.id', 'Marketing', '081234567911'),
    ('Wawan Nasution', 'wawan.nasution@wit.id', 'Sales', '081234567912'),
    ('Xena Harahap', 'xena.harahap@wit.id', 'Product', '081234567913'),
    ('Yusuf Daulay', 'yusuf.daulay@wit.id', 'Technology', '081234567914'),
    ('Zahra Ginting', 'zahra.ginting@wit.id', 'Finance', '081234567915'),
    ('Andi Sembiring', 'andi.sembiring@wit.id', 'Technology', '081234567916'),
    ('Bella Tarigan', 'bella.tarigan@wit.id', 'Marketing', '081234567917'),
    ('Cahyo Sinaga', 'cahyo.sinaga@wit.id', 'Sales', '081234567918'),
    ('Dina Simatupang', 'dina.simatupang@wit.id', 'Human Resources', '081234567919'),
    ('Erwin Wahyudi', 'erwin.wahyudi@wit.id', 'Technology', '081234567920'),
    ('Fitri Kurniawan', 'fitri.kurniawan@wit.id', 'Finance', '081234567921'),
    ('Gilang Aditya', 'gilang.aditya@wit.id', 'Technology', '081234567922'),
    ('Hana Mahendra', 'hana.mahendra@wit.id', 'Marketing', '081234567923'),
    ('Irfan Pradana', 'irfan.pradana@wit.id', 'Sales', '081234567924'),
    ('Jasmine Saputra', 'jasmine.saputra@wit.id', 'Product', '081234567925'),
    ('Kevin Wicaksana', 'kevin.wicaksana@wit.id', 'Technology', '081234567926'),
    ('Lina Nugraha', 'lina.nugraha@wit.id', 'Finance', '081234567927'),
    ('Mario Pangestu', 'mario.pangestu@wit.id', 'Technology', '081234567928'),
    ('Nadia Laksono', 'nadia.laksono@wit.id', 'Human Resources', '081234567929'),
    ('Olivia Handoko', 'olivia.handoko@wit.id', 'Marketing', '081234567930'),
    ('Panji Surya', 'panji.surya@wit.id', 'Sales', '081234567931'),
    ('Ratna Mandala', 'ratna.mandala@wit.id', 'Product', '081234567932'),
    ('Sandro Baskara', 'sandro.baskara@wit.id', 'Technology', '081234567933'),
    ('Tari Candra', 'tari.candra@wit.id', 'Finance', '081234567934'),
    ('Usman Dharma', 'usman.dharma@wit.id', 'Technology', '081234567935'),
    ('Via Eka', 'via.eka@wit.id', 'Marketing', '081234567936'),
    ('Willy Farida', 'willy.farida@wit.id', 'Sales', '081234567937'),
    ('Yanti Gunawan', 'yanti.gunawan@wit.id', 'Human Resources', '081234567938'),
    ('Zainal Hamzah', 'zainal.hamzah@wit.id', 'Technology', '081234567939')
) AS users(full_name, email, department, phone)
CROSS JOIN auth_role
ON CONFLICT (email) DO UPDATE SET
  department = EXCLUDED.department,
  phone = EXCLUDED.phone,
  is_active = true,
  updated_at = NOW();
