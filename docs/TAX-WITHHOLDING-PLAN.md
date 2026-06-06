# Tax Withholding Enhancement — PPN & PPh "Dibayar Oleh" (Design Plan)

> Status: **DESIGN — not yet implemented** (per decision: "rancang dulu, jangan koding").
> Companion to `docs/JOURNAL-AUTOMATION-PLAN.md` and `JOURNAL-AUTOMATION-REVISION-SPEC.md`.
> Branch: `claude/serene-galileo-kwyFL`.
>
> **Decisions locked in this round (Finance):**
> - Add a scalable **conditional premise** to every transaction module: a *"Dibayar/Dipungut Oleh"* flag for **both PPN and PPh**, driving module calculation **and** journal automation.
> - PPh type in scope: **PPh 23 (jasa, default 2%)**.
> - Timing: **at payment** (PSAK — withholding crystallizes when cash moves).
> - Scope now: **design only**; implementation phased after Finance + tax-consultant validation.
>
> ⚠️ Tarif & aplikabilitas pajak adalah keputusan hukum — **wajib dikonfirmasi ke konsultan pajak** sebelum go-live. Dokumen ini merancang *mekanismenya*, bukan menetapkan tarif yang mengikat.

---

## 1. Inti masalah & gagasan

PPN **ditambahkan di atas** harga; PPh **dipotong dari** pembayaran, dan arah pemotongannya berbeda tergantung kita penjual atau pembeli. Hari ini sistem hanya menangani PPN (satu arah, satu skenario). Untuk PPh — dan untuk PPN non-standar (WAPU / DTP) — kita butuh model yang **eksplisit menyatakan siapa yang memungut/menyetor pajak** per transaksi.

**Gagasan inti (sesuai arahan Finance):** setiap modul transaksi membawa premis bersyarat:

| Field baru | Arti | Nilai |
|---|---|---|
| `ppn_dipungut_oleh` | Siapa yang memungut & menyetor PPN | `kita` · `lawan_transaksi` · `tidak_ada` |
| `pph_jenis` | Jenis PPh yang berlaku | `null` · `pph23` · `pph42` · `pph21` · … |
| `pph_tarif` | Tarif (%) | mis. `2.00` (default PPh 23) |
| `pph_dipotong_oleh` | Siapa yang memotong & menyetor PPh | `kita` · `lawan_transaksi` · `tidak_ada` |

Flag inilah yang menentukan **arah & keberadaan** baris pajak di jurnal — bukan hard-code per trigger. Engine tet앙 config-driven; flag hanya menentukan apakah nominal pajak > 0 dan akun mana yang dipakai.

---

## 2. Aturan emas (siapa menyetor → sisi akun)

> **Jika KITA yang menyetor ke negara → muncul di buku kita sebagai _Hutang Pajak_ (liability).**
> **Jika LAWAN yang menyetor (memotong dari kita) → muncul sebagai _Pajak Dibayar Dimuka_ (asset/kredit pajak).**
> **Jika `tidak_ada` → tidak ada baris pajak.**

### 2.1 Matriks PPh

| Konteks | `pph_dipotong_oleh` | Efek jurnal (saat **pembayaran**) | Akun |
|---|---|---|---|
| **AP** (kita beli jasa) | `kita` | Kita potong dari vendor; kas keluar < hutang | **Cr** `2-10200-2` Hutang PPh 23 |
| **AP** | `tidak_ada` | — | — |
| **AR** (kita jual jasa) | `lawan_transaksi` | Customer potong dari kita; kas masuk < piutang | **Dr** `1-10400-3` PPh 23 Dibayar Dimuka *(akun baru, lihat §4)* |
| **AR** | `tidak_ada` | — | — |

> Catatan: pada AP, "dipotong oleh kita" = kita withholding agent. Pada AR, "dipotong oleh lawan" = customer withholding agent. Arah sudah ditentukan konteks AR/AP; flag-nya memastikan apakah pemotongan benar-benar terjadi (mis. vendor non-jasa → `tidak_ada`).

### 2.2 Matriks PPN

| Konteks | `ppn_dipungut_oleh` | Efek jurnal | Akun |
|---|---|---|---|
| **AR** (kita jual) | `kita` (PKP normal) | Kita pungut output & setor | **Cr** `2-10200-4` Hutang PPN *(perilaku sekarang)* |
| **AR** | `lawan_transaksi` (customer **WAPU**) | Customer pungut & setor sendiri; kita tak punya hutang PPN | **tidak ada** baris hutang PPN; kas masuk < piutang sebesar PPN |
| **AR** | `tidak_ada` (non-PKP) | — | — |
| **AP** (kita beli) | `kita` (kita bayar input ke vendor) | Kredit pajak masukan | **Dr** `1-10400-1` PPN Masukan *(perilaku sekarang)* |
| **AP** | `tidak_ada` (DTP/non-PKP) | — | — |

> WAPU (Wajib Pungut, mis. customer BUMN/bendaharawan) berperilaku seperti withholding: PPN tidak kita terima sebagai kas, melainkan disetor langsung oleh customer. Ini sebabnya satu mekanisme "dipungut oleh" cocok untuk PPN **dan** PPh.

---

## 3. Dampak ke logic perhitungan modul

Keputusan timing = **saat pembayaran**, jadi nilai *invoice/tagihan* tidak berubah; yang berubah adalah **kas yang benar-benar berpindah** vs **jumlah yang dianggap lunas**.

### 3.1 Pemisahan penting: "Lunas" ≠ "Kas berpindah"
Saat kita potong PPh 23 Rp2 dari tagihan Rp111:
- **Kas keluar = Rp109** (yang dikirim ke vendor)
- **Hutang lunas = Rp111** (vendor dianggap lunas penuh; Rp2 kita setor ke negara atas namanya, dengan bukti potong)

Maka record pembayaran harus menyimpan **dua angka**:

| Konsep | Token nominal (baru/edit) | Rumus |
|---|---|---|
| Jumlah diselesaikan (gross) | `bayar_sekarang` | input |
| PPh dipotong | `pph_amount` | `dpp × pph_tarif` (dpp = subtotal, exclude PPN) |
| PPN dipungut lawan (WAPU/AR) | `ppn_amount` | sudah ada |
| **Kas neto** | `kas_neto` *(baru, computed)* | `bayar_sekarang − pph_amount − (ppn_wapu?)` |

`amount_paid` modul tetap bertambah sebesar **gross** (`bayar_sekarang`), bukan kas neto — agar status lunas akurat.

### 3.2 DPP (dasar pengenaan)
PPh 23 dihitung dari **DPP = subtotal jasa** (tanpa PPN). Sistem sudah punya `subtotal` di AR & AP, jadi DPP tersedia. Perlu penegasan per dokumen apakah seluruh subtotal kena PPh atau hanya komponen jasa (lihat §7 open question).

---

## 4. Perubahan database (rancangan)

### 4.1 COA — satu akun baru
Semua akun pemotongan sudah ada **kecuali** sisi aset kredit PPh 23:

| Akun | Status | Aksi |
|---|---|---|
| `2-10200-2` Hutang PPh 23 | ada | pakai |
| `1-10400-2` PPh 25 Dibayar Dimuka | ada | — |
| **`1-10400-3` PPh 23 Dibayar Dimuka** | **belum ada** | **tambah** (asset, creditable) — untuk sisi AR |

> PPh 4(2) bersifat **final** → tidak creditable; bila kelak dipakai di sisi AR, perlakuannya beda (beban pajak final, bukan aset). Di luar scope PPh 23 sekarang.

### 4.2 Kolom premis pajak per modul
Tambahkan blok kolom seragam (atau tabel `transaksi_pajak` ternormalisasi — lihat §8) ke dokumen sumber:

**`ar_invoices`**, **`ap_invoices`** (level header), dan **`pembayaran`** / record pembayaran:
```
ppn_dipungut_oleh   VARCHAR(16)  DEFAULT 'kita'      CHECK (kita|lawan_transaksi|tidak_ada)
pph_jenis           VARCHAR(12)  NULL               CHECK (pph23|pph42|pph21| ...)
pph_tarif           NUMERIC(5,2) NULL               -- mis. 2.00
pph_dipotong_oleh   VARCHAR(16)  DEFAULT 'tidak_ada' CHECK (kita|lawan_transaksi|tidak_ada)
pph_dpp             NUMERIC(20,2) NULL               -- default = subtotal
pph_amount          NUMERIC(20,2) DEFAULT 0          -- computed: dpp × tarif/100
```
- Default `pph_dipotong_oleh = 'tidak_ada'` → **zero-impact** untuk semua data lama (backward-compatible; jurnal existing tak berubah).
- `ppn_dipungut_oleh` default `'kita'` → cocok dengan perilaku PPN saat ini.

### 4.3 Engine vocabulary (CHECK `chk_sumber_nominal`)
Tambah token: `pph_amount`, `kas_neto`. (Sudah ada: `grand_total, subtotal, pajak, total_piutang, bayar_sekarang, nominal_bayar, line_amount, line_tax, biaya_lain_amount`.)

---

## 5. Perubahan engine

Engine sudah punya mekanisme **skip baris ber-nominal 0** — kita manfaatkan itu, tidak perlu logika percabangan rumit:

1. Modul menghitung `pph_amount` (>0 hanya jika flag mengaktifkan PPh) dan `kas_neto`.
2. Payload `processJournalAutomation()` membawa `nominals.pph_amount`, `nominals.kas_neto`, dst.
3. Config tiap trigger pembayaran menambah **baris PPh opsional** (`is_optional = true`) + mengganti baris bank agar memakai `kas_neto` (bukan gross).
4. Karena baris PPh ber-amount 0 saat `tidak_ada`, engine otomatis melewatinya → jurnal lama tetap identik.

**Resolusi akun PPh** (asset vs liability) tetap **fixed per trigger** karena arah ditentukan konteks AR/AP:
- `AP-PAY` → baris **Cr Hutang PPh 23** (`2-10200-2`)
- `AR-PAY-RCV` → baris **Dr PPh 23 Dibayar Dimuka** (`1-10400-3`)

Sehingga *tidak* perlu dynamic_source baru untuk PPh — cukup fixed COA + skip-zero. (Bila kelak multi-jenis PPh dalam satu trigger, baru kita perkenalkan `dynamic_source: pph_payable_coa` yang resolve dari `pph_jenis`.)

---

## 6. Perubahan konfigurasi jurnal (contoh)

### 6.1 `AP-PAY` (bayar tagihan, kita potong PPh 23)
| # | Posisi | Akun | Nominal | Opsional |
|---|---|---|---|---|
| 1 | Debit | `2-10100` Hutang Usaha | `bayar_sekarang` (gross) | tidak |
| 2 | Credit | `2-10200-2` Hutang PPh 23 | `pph_amount` | **ya** |
| 3 | Credit | *dynamic* `ap_bank_coa` | `kas_neto` | tidak |

Saat `pph = 0`: baris #2 di-skip, #3 `kas_neto = gross` → identik perilaku sekarang. ✔ balanced.

### 6.2 `AR-PAY-RCV` (terima bayar, customer potong PPh 23)
| # | Posisi | Akun | Nominal | Opsional |
|---|---|---|---|---|
| 1 | Debit | *dynamic* `ar_bank_coa` | `kas_neto` | tidak |
| 2 | Debit | `1-10400-3` PPh 23 Dibayar Dimuka | `pph_amount` | **ya** |
| 3 | Credit | `1-10100` Piutang Usaha | `bayar_sekarang` (gross) | tidak |

### 6.3 PPN WAPU di `AR-PAY-RCV` (opsional, fase lanjut)
Bila `ppn_dipungut_oleh = lawan_transaksi`, kas masuk juga berkurang sebesar PPN; baris kredit "PPN dipungut WAPU" / penyesuaian ditambahkan analog. Dirancang setelah PPh stabil.

---

## 7. Contoh jurnal end-to-end

**Skenario A — AP, jasa konsultan Rp1.000.000 + PPN 11% + PPh 23 2%:**
```
Terima tagihan (AP-BILL-RCV, saat approve):
  Dr Beban Jasa            1.000.000
  Dr PPN Masukan             110.000
     Cr Hutang Usaha               1.110.000

Bayar (AP-PAY, saat pembayaran):
  Dr Hutang Usaha          1.110.000
     Cr Hutang PPh 23                 20.000   (pph_amount = 1.000.000 × 2%)
     Cr Bank                       1.090.000   (kas_neto = 1.110.000 − 20.000)
```

**Skenario B — AR, kita tagih jasa Rp1.000.000 + PPN 11%, customer potong PPh 23 2%:**
```
Terbit invoice (AR-INV-ISSUE):  [tidak berubah]
  Dr Piutang Usaha         1.110.000
     Cr Pendapatan Jasa            1.000.000
     Cr Hutang PPN                   110.000

Terima bayar (AR-PAY-RCV):
  Dr Bank                  1.090.000   (kas_neto)
  Dr PPh 23 Dibayar Dimuka    20.000   (aset kredit pajak)
     Cr Piutang Usaha              1.110.000
```

Kedua jurnal tetap **balanced** dan memakai mekanisme skip-zero yang ada.

---

## 8. Pilihan arsitektur penyimpanan premis pajak

| Opsi | Kelebihan | Kekurangan |
|---|---|---|
| **A. Kolom eksplisit per modul** (§4.2) | Query sederhana, mudah di-index, cocok form | Duplikasi kolom di tiap tabel |
| **B. Tabel `transaksi_pajak` ternormalisasi** (1 dokumen → N baris pajak) | Scalable untuk banyak jenis pajak/multi-baris, audit rapi | Lebih banyak join, form lebih kompleks |

**Rekomendasi:** mulai **Opsi A** (PPh 23 + PPN flag, kebutuhan sekarang), siapkan migrasi ke **Opsi B** bila kelak butuh banyak jenis pajak per transaksi. Keduanya kompatibel dengan engine karena engine hanya menerima `pph_amount`/`kas_neto` terhitung.

---

## 9. Yang perlu dikonfirmasi ke konsultan pajak (sebelum implement)

1. **Tarif PPh 23** untuk jenis jasa yang Anda transaksikan (umumnya 2% ber-NPWP; **4% tanpa NPWP** — perlukah handling non-NPWP?).
2. **DPP PPh**: seluruh `subtotal` atau hanya komponen jasa (bila invoice campur barang+jasa)?
3. **Sisi AR**: apakah customer Anda memang withholding agent (memotong PPh dari pembayaran)? Untuk siapa saja?
4. **PPN WAPU/DTP**: ada customer BUMN/bendaharawan (WAPU) atau transaksi PPN DTP? (menentukan apakah `ppn_dipungut_oleh = lawan` perlu di fase awal)
5. **PPh 4(2) final**: dipakai? (sewa bangunan, konstruksi) — perlakuan beda (final, non-creditable).
6. **Pembulatan** PPh (umumnya dibulatkan ke rupiah penuh).

---

## 10. Rencana implementasi bertahap (setelah validasi)

- **Fase A — Fondasi:** tambah COA `1-10400-3`; tambah kolom premis pajak (Opsi A) + default backward-compatible; tambah token engine `pph_amount`, `kas_neto`.
- **Fase B — Modul AP:** logic hitung `pph_amount`/`kas_neto` di AP pay; UI input flag PPh 23 + tarif; baris config `AP-PAY`.
- **Fase C — Modul AR:** sisi terima bayar (customer potong); UI flag; baris config `AR-PAY-RCV`.
- **Fase D — PPN non-standar:** WAPU/DTP (`ppn_dipungut_oleh = lawan`).
- **Fase E — Pembayaran internal (UC#5)** bila relevan.
- **Fase F — Laporan & rekonsiliasi pajak:** daftar bukti potong, saldo Hutang PPh / PPh Dibayar Dimuka untuk SPT.
- **Fase G — Tes & QA** (modul `journal-automation` / `tax-withholding`).

Setiap fase: backward-compatible (default `tidak_ada` → jurnal lama tak berubah), idempotent, non-blocking — konsisten dengan engine yang ada.

---

## 11. Open questions (untuk Finance)

1. Apakah **bukti potong** (nomor, tanggal) perlu disimpan & dicetak dari sistem, atau cukup angka di jurnal?
2. Untuk AP, apakah pemotongan PPh **selalu** saat pembayaran, atau ada vendor yang invoice-nya sudah net-of-PPh?
3. Apakah ada transaksi yang **PPh tapi tanpa PPN** (atau sebaliknya)? (desain sudah mengakomodasi keduanya independen)
4. Preferensi penyimpanan: Opsi A (kolom) atau langsung Opsi B (tabel pajak)?
5. Perlukah **histori perubahan tarif** (mis. tarif berubah tahun depan) — apakah tarif disimpan per-transaksi (recommended, sudah di rancangan) sudah cukup?
