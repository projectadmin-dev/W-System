# Tax Withholding Enhancement — PPN & PPh "Dibayar Oleh" (Design Plan)

> Status: **DESIGN — not yet implemented** (per decision: "rancang dulu, jangan koding").
> Companion to `docs/JOURNAL-AUTOMATION-PLAN.md` and `JOURNAL-AUTOMATION-REVISION-SPEC.md`.
> Branch: `claude/serene-galileo-kwyFL`.
>
> **Decisions locked in this round (Finance):**
> - Add a scalable **conditional premise** to every transaction module: a *"Dibayar/Dipungut Oleh"* flag for **both PPN and PPh**, driving module calculation **and** journal automation.
> - PPh type in scope: **PPh 23 (jasa)** — default **2% (ber-NPWP)**, with **non-NPWP = 4%** supported (rate per-transaction, scalable).
> - **PPN WAPU/DTP**: tidak ada customer WAPU saat ini → **ditunda** (Fase D, dirancang tapi tidak diimplementasi dulu).
> - Timing: **at payment** (PSAK — withholding crystallizes when cash moves).
> - **Kedua arah dalam scope:** sisi **AP** (kita memotong vendor → Hutang PPh) **dan** sisi **AR** (customer memotong kita → PPh Dibayar Dimuka). Finance mengonfirmasi customer memang memotong PPh.
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
| `lawan_punya_npwp` | Lawan transaksi ber-NPWP? | `true` · `false` |
| `pph_tarif` | Tarif (%) — **bisa di-override** | default dari (`pph_jenis`, `lawan_punya_npwp`) |
| `pph_dipotong_oleh` | Siapa yang memotong & menyetor PPh | `kita` · `lawan_transaksi` · `tidak_ada` |

**Penentuan tarif (scalable, default cerdas):** tarif **tidak** hard-code. Sistem menyimpan tabel default `(pph_jenis, npwp?) → tarif`, lalu **boleh di-override** per transaksi:

| `pph_jenis` | ber-NPWP | tanpa NPWP | Catatan |
|---|---|---|---|
| `pph23` | **2%** *(default umum)* | **4%** *(2× lipat)* | PPh 23 jasa |
| `pph42` | (final, per objek) | — | sewa bangunan 10%, dll — fase lanjut |
| `pph21` | progresif/objek | +20% | individu — fase lanjut |

Saat `lawan_punya_npwp = false` untuk `pph23`, sistem otomatis mengisi `pph_tarif = 4.00` (tetap bisa diubah manual). Menambah jenis/tarif baru cukup menambah baris di tabel default — tanpa ubah engine.

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

### 3.2 DPP Dinamis (kategori + override manual) — **enhancement struktural**

DPP **tidak selalu = subtotal**. Dasar hukumnya nyata di Indonesia:
- **PPN — "DPP Nilai Lain"** (PMK Nilai Lain): mis. jasa biro perjalanan/pariwisata, jasa pengiriman paket, freight forwarding → **DPP = 10%** dari nilai (PPN efektif ±1,1%); pemakaian sendiri/cuma-cuma; emas perhiasan; dll.
- **PPh 23 — "jumlah bruto"**: untuk jasa tertentu DPP hanya **komponen jasa** (tidak termasuk reimbursement/material yang dipisah & dibuktikan), mis. catering, konstruksi, freight forwarding.

Karena itu DPP dirancang **scalable**: berbasis **kategori data-driven** + dapat **di-override manual** oleh finance saat input.

**Tabel referensi `dpp_kategori`** (data, bukan kode — tambah kategori tanpa ubah engine):

| Kolom | Arti |
|---|---|
| `kode`, `nama` | mis. `PENUH`, `NL-10`, `MANUAL` |
| `jenis_pajak` | `ppn` · `pph` · `both` |
| `metode` | `nilai_penuh` · `persentase` · `manual` |
| `faktor` | untuk `persentase`, mis. `0.10` (=10%); `1.00` untuk penuh |
| `keterangan`, `is_aktif` | — |

**Seed awal:**
| kode | metode | faktor | contoh penggunaan |
|---|---|---|---|
| `PENUH` *(default)* | nilai_penuh | 1.00 | DPP = subtotal penuh |
| `NL-10` | persentase | 0.10 | jasa biro perjalanan / pengiriman / freight forwarding |
| `MANUAL` | manual | — | finance isi DPP langsung (kasus khusus) |

**Logika resolve (engine/module):**
```
base = subtotal (exclude PPN)                       -- default dasar
dpp  = metode='nilai_penuh' → base
       metode='persentase'  → round(base × faktor)
       metode='manual'      → input_finance (default = base)
pph_amount = round(dpp × pph_tarif / 100)           -- dibulatkan ke rupiah penuh
```

**Pemisahan:** kategori DPP **PPN** dan **PPh** independen (bisa beda kategori di satu transaksi).

**Yang disimpan per transaksi (snapshot, untuk audit & immutability):**
- `pph_dpp_kategori_id` (FK) + `pph_dpp` (nilai ter-resolve)
- *(opsional, fase PPN lanjut)* `ppn_dpp_kategori_id` + `ppn_dpp`

**UI saat input data (finance):**
- Dropdown **Kategori DPP** (default `PENUH`).
- Field **DPP**: auto-terisi & read-only untuk `PENUH`/`persentase`; **editable** bila `MANUAL`.
- Tampilkan **DPP & PPh terhitung real-time** sebelum simpan.
- Validasi lunak: DPP manual > subtotal → peringatan (tidak diblok; akomodasi kasus gross-up).

> **Catatan:** kolom `pph_dpp` dari Fase A tetap dipakai sebagai *nilai ter-resolve*. Yang ditambah di enhancement ini adalah **tabel `dpp_kategori` + kolom `*_dpp_kategori_id`** dan logika resolve — sehingga DPP jadi dinamis & dapat diatur stakeholder, bukan konstanta.

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
lawan_punya_npwp    BOOLEAN      DEFAULT true       -- false → tarif naik (PPh 23: 2%→4%)
pph_tarif           NUMERIC(5,2) NULL               -- auto dari (jenis,npwp); bisa di-override
pph_dipotong_oleh   VARCHAR(16)  DEFAULT 'tidak_ada' CHECK (kita|lawan_transaksi|tidak_ada)
pph_dpp             NUMERIC(20,2) NULL               -- nilai DPP ter-resolve (snapshot)
pph_amount          NUMERIC(20,2) DEFAULT 0          -- computed: dpp × tarif/100
```
*(✅ kolom di atas sudah dibuat di **Fase A**.)*

**Tambahan enhancement DPP dinamis** (lihat §3.2):
```
pph_dpp_kategori_id  UUID NULL  REFERENCES dpp_kategori(id)   -- kategori DPP PPh (default = PENUH)
-- (fase PPN lanjut) ppn_dpp_kategori_id, ppn_dpp
```

- Default `pph_dipotong_oleh = 'tidak_ada'` → **zero-impact** untuk semua data lama (backward-compatible; jurnal existing tak berubah).
- `ppn_dipungut_oleh` default `'kita'` → cocok dengan perilaku PPN saat ini.
- `lawan_punya_npwp` default `true` (tarif 2%); set `false` untuk vendor/customer tanpa NPWP → engine isi `pph_tarif = 4.00`. Tarif tetap bisa di-override manual.
- **Tabel referensi tarif** `pph_tarif_default(pph_jenis, ber_npwp, tarif)` (data, bukan kode) → menambah jenis/tarif baru tanpa ubah engine.
- **Tabel referensi DPP** `dpp_kategori(kode, jenis_pajak, metode, faktor)` (data, bukan kode) → kategori DPP baru tanpa ubah engine; default kategori `PENUH` (faktor 1.00) menjaga perilaku Fase A.

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

## 9. Status konfirmasi pajak

| # | Item | Status |
|---|---|---|
| 1 | **Tarif PPh 23** & non-NPWP | ✅ **Resolved** — default **2% ber-NPWP**, **4% tanpa NPWP** (di-handle agar scalable; rate per-transaksi + tabel default) |
| 2 | **PPN WAPU/DTP** | ✅ **Resolved** — belum ada customer WAPU → **ditunda** (Fase D dirancang, tak diimplementasi dulu) |
| 3 | **Sisi AR** — customer memotong PPh dari kita? | ✅ **Resolved** — **Ya**, customer memotong → Fase C **masuk scope** (PPh 23 Dibayar Dimuka saat terima bayar) |
| 4 | **DPP PPh** (seluruh subtotal vs sebagian / DPP Nilai Lain) | ✅ **Resolved (desain)** — dibuat **dinamis**: kategori DPP data-driven (`PENUH`/`NL-10`/`MANUAL`) + override manual saat input (Fase A.2, §3.2). Tarif & kategori spesifik tetap dikonfirmasi konsultan |
| 5 | **PPh 4(2) final** (sewa bangunan/konstruksi) dipakai? | ⏳ Di luar scope sekarang (fase lanjut) |
| 6 | **Pembulatan** PPh ke rupiah penuh | ⏳ Asumsi default: dibulatkan; konfirmasi |

---

## 10. Rencana implementasi bertahap (setelah validasi)

- **Fase A — Fondasi:** ✅ **selesai** — COA `1-10400-3`; tabel `pph_tarif_default`; kolom premis pajak + default backward-compatible; token engine `pph_amount`, `kas_neto`.
- **Fase A.2 — DPP dinamis** *(enhancement, lihat §3.2)*: tabel `dpp_kategori` (data-driven) + kolom `*_dpp_kategori_id`; helper resolve DPP (`nilai_penuh|persentase|manual`) + pembulatan; **seed `PENUH`/`NL-10`/`MANUAL`**. Default `PENUH` → tak mengubah perilaku. Dipakai oleh Fase B/C.
- **Fase B — Modul AP** *(prioritas — kita memotong vendor)*: logic hitung `pph_amount`/`kas_neto` + auto-tarif via NPWP + **resolve DPP via kategori/manual** di AP pay; UI input flag PPh 23 + NPWP + **kategori DPP + field DPP** + tarif; baris config `AP-PAY`.
- **Fase C — Modul AR** *(in scope — customer memotong PPh dari kita)*: sisi terima bayar; catat `1-10400-3` PPh 23 Dibayar Dimuka (kredit pajak); UI flag + **kategori/field DPP**; baris config `AR-PAY-RCV`.
- **Fase D — PPN non-standar (DITUNDA):** WAPU/DTP (`ppn_dipungut_oleh = lawan`) — tidak ada kebutuhan saat ini.
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
