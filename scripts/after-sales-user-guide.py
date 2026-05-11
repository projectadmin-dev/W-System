#!/usr/bin/env python3
"""
After Sales Module — User Guideline Document Generator
Generates a professional PDF using ReportLab
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm, mm
from reportlab.lib.colors import HexColor, white, black
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether, ListFlowable, ListItem
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.platypus import PageBreak
from reportlab.lib import colors
import datetime

# ─── COLOR PALETTE ──────────────────────────────────────────────
WitBlue    = HexColor("#1a56db")
WitDark    = HexColor("#1e293b")
WitGray    = HexColor("#64748b")
WitLight   = HexColor("#f1f5f9")
WitBorder  = HexColor("#e2e8f0")
WitGreen   = HexColor("#16a34a")
WitOrange  = HexColor("#ea580c")
WitPurple  = HexColor("#9333ea")
WitRed     = HexColor("#dc2626")

PAGE_W, PAGE_H = A4

def build_styles():
    base = getSampleStyleSheet()

    styles = {}

    styles["cover_title"] = ParagraphStyle(
        "cover_title",
        fontName="Helvetica-Bold",
        fontSize=28,
        leading=34,
        alignment=TA_CENTER,
        textColor=WitDark,
        spaceAfter=8,
    )
    styles["cover_sub"] = ParagraphStyle(
        "cover_sub",
        fontName="Helvetica",
        fontSize=13,
        leading=18,
        alignment=TA_CENTER,
        textColor=WitGray,
        spaceAfter=4,
    )
    styles["cover_meta"] = ParagraphStyle(
        "cover_meta",
        fontName="Helvetica",
        fontSize=10,
        alignment=TA_CENTER,
        textColor=WitGray,
    )
    styles["h1"] = ParagraphStyle(
        "h1",
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=24,
        textColor=WitDark,
        spaceBefore=24,
        spaceAfter=8,
    )
    styles["h2"] = ParagraphStyle(
        "h2",
        fontName="Helvetica-Bold",
        fontSize=13,
        leading=18,
        textColor=WitBlue,
        spaceBefore=16,
        spaceAfter=6,
    )
    styles["h3"] = ParagraphStyle(
        "h3",
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=15,
        textColor=WitDark,
        spaceBefore=10,
        spaceAfter=4,
    )
    styles["body"] = ParagraphStyle(
        "body",
        fontName="Helvetica",
        fontSize=10,
        leading=15,
        textColor=WitDark,
        alignment=TA_JUSTIFY,
        spaceAfter=6,
    )
    styles["body_sm"] = ParagraphStyle(
        "body_sm",
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        textColor=WitDark,
        alignment=TA_JUSTIFY,
        spaceAfter=4,
    )
    styles["bullet"] = ParagraphStyle(
        "bullet",
        fontName="Helvetica",
        fontSize=10,
        leading=15,
        textColor=WitDark,
        leftIndent=14,
        spaceAfter=3,
        bulletIndent=4,
    )
    styles["note"] = ParagraphStyle(
        "note",
        fontName="Helvetica-Oblique",
        fontSize=9,
        leading=13,
        textColor=WitGray,
        leftIndent=12,
        rightIndent=12,
        spaceAfter=6,
        borderPad=6,
    )
    styles["tag_auto"] = ParagraphStyle(
        "tag_auto",
        fontName="Helvetica-Bold",
        fontSize=9,
        textColor=white,
        alignment=TA_CENTER,
        leading=12,
    )
    styles["tag_manual"] = ParagraphStyle(
        "tag_manual",
        fontName="Helvetica-Bold",
        fontSize=9,
        textColor=white,
        alignment=TA_CENTER,
        leading=12,
    )
    styles["footer"] = ParagraphStyle(
        "footer",
        fontName="Helvetica",
        fontSize=8,
        alignment=TA_CENTER,
        textColor=WitGray,
    )
    styles["table_header"] = ParagraphStyle(
        "table_header",
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=12,
        textColor=white,
        alignment=TA_CENTER,
    )
    styles["table_cell"] = ParagraphStyle(
        "table_cell",
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        textColor=WitDark,
    )
    styles["table_cell_bold"] = ParagraphStyle(
        "table_cell_bold",
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=13,
        textColor=WitDark,
    )
    styles["caption"] = ParagraphStyle(
        "caption",
        fontName="Helvetica-Oblique",
        fontSize=8,
        leading=11,
        textColor=WitGray,
        alignment=TA_CENTER,
        spaceAfter=8,
    )

    return styles


def tag_badge(text, color, styles):
    """Return a Paragraph styled as a colored badge."""
    return Paragraph(f"<b>{text}</b>", ParagraphStyle(
        f"badge_{text}",
        fontName="Helvetica-Bold",
        fontSize=8,
        textColor=white,
        alignment=TA_CENTER,
        leading=11,
        backColor=color,
        borderPad=3,
    ))


def flow_badge(text, bg_color):
    """Small inline colored text badge for table cells."""
    return Paragraph(f"<b>{text}</b>", ParagraphStyle(
        f"fb_{text}",
        fontName="Helvetica-Bold",
        fontSize=8,
        textColor=white,
        alignment=TA_CENTER,
        leading=11,
        backColor=bg_color,
        borderPad=2,
    ))


def build_cover(story, styles):
    # Top spacer
    story.append(Spacer(1, 4*cm))

    # Decorative top bar
    bar_data = [[""]]
    bar_table = Table(bar_data, colWidths=[PAGE_W - 4*cm], rowHeights=[6])
    bar_table.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), WitBlue),
        ("TOPPADDING", (0,0), (-1,-1), 0),
        ("BOTTOMPADDING", (0,0), (-1,-1), 0),
        ("LEFTPADDING", (0,0), (-1,-1), 0),
        ("RIGHTPADDING", (0,0), (-1,-1), 0),
    ]))
    story.append(bar_table)
    story.append(Spacer(1, 1.5*cm))

    # Title
    story.append(Paragraph("DOKUMEN PEDOMAN PENGGUNA", styles["cover_title"]))
    story.append(Spacer(1, 0.4*cm))
    story.append(Paragraph("After Sales Module", ParagraphStyle(
        "cover_modul", fontName="Helvetica-Bold", fontSize=22, leading=28,
        alignment=TA_CENTER, textColor=WitBlue
    )))
    story.append(Spacer(1, 0.6*cm))
    story.append(HRFlowable(width="60%", thickness=2, color=WitBlue, spaceAfter=0, spaceBefore=0, hAlign="CENTER"))
    story.append(Spacer(1, 0.8*cm))
    story.append(Paragraph("User Guideline — Alur Kerja & Panduan Teknis", styles["cover_sub"]))
    story.append(Paragraph("W-System Internal Application", styles["cover_sub"]))

    story.append(Spacer(1, 2*cm))

    # Info box
    info_data = [
        [Paragraph("<b>Dokumen ID</b>", styles["body_sm"]),
         Paragraph("WIT-AS-PD-001", styles["body_sm"])],
        [Paragraph("<b>Versi</b>", styles["body_sm"]),
         Paragraph("1.0", styles["body_sm"])],
        [Paragraph("<b>Tanggal</b>", styles["body_sm"]),
         Paragraph(datetime.date.today().strftime("%d %B %Y"), styles["body_sm"])],
        [Paragraph("<b>Dibuat oleh</b>", styles["body_sm"]),
         Paragraph("After Sales Team — WIT.ID", styles["body_sm"])],
        [Paragraph("<b>Klasifikasi</b>", styles["body_sm"]),
         Paragraph("Internal Use Only", styles["body_sm"])],
    ]
    info_table = Table(info_data, colWidths=[4*cm, 8*cm])
    info_table.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), WitLight),
        ("BOX", (0,0), (-1,-1), 1, WitBorder),
        ("INNERGRID", (0,0), (-1,-1), 0.5, WitBorder),
        ("TOPPADDING", (0,0), (-1,-1), 6),
        ("BOTTOMPADDING", (0,0), (-1,-1), 6),
        ("LEFTPADDING", (0,0), (-1,-1), 10),
        ("RIGHTPADDING", (0,0), (-1,-1), 10),
        ("FONTNAME", (0,0), (0,-1), "Helvetica-Bold"),
    ]))
    story.append(info_table)

    story.append(Spacer(1, 2.5*cm))

    # Bottom bar
    bar2 = Table([[""]], colWidths=[PAGE_W - 4*cm], rowHeights=[6])
    bar2.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), WitBlue),
        ("TOPPADDING", (0,0), (-1,-1), 0),
        ("BOTTOMPADDING", (0,0), (-1,-1), 0),
        ("LEFTPADDING", (0,0), (-1,-1), 0),
        ("RIGHTPADDING", (0,0), (-1,-1), 0),
    ]))
    story.append(bar2)

    story.append(PageBreak())


def build_toc(story, styles):
    story.append(Paragraph("Daftar Isi", styles["h1"]))
    story.append(HRFlowable(width="100%", thickness=1, color=WitBorder, spaceAfter=12))

    toc_items = [
        ("1", "Pendahuluan", "3"),
        ("2", "Ringkasan Modul After Sales", "3"),
        ("3", "Modul 1 — Client Relationship Tracking (US-AFTER-001)", "4"),
        ("   3.1", "Tujuan & Deskripsi", "4"),
        ("   3.2", "Alur Kerja (User Flow)", "4"),
        ("   3.3", "Detail Form Tambah Catatan Kontak", "5"),
        ("   3.4", "Tabel Ringkasan Input vs Sistem", "6"),
        ("4", "Modul 2 — Auto Survey (US-AFTER-002)", "7"),
        ("   4.1", "Tujuan & Deskripsi", "7"),
        ("   4.2", "Alur Kerja (User Flow)", "7"),
        ("   4.3", "Rincian Proses: Mana Otomatis, Mana Manual", "8"),
        ("5", "Modul 3 — Pengumuman & Update ke Client (US-AFTER-003)", "9"),
        ("   5.1", "Tujuan & Deskripsi", "9"),
        ("   5.2", "Alur Kerja (User Flow)", "9"),
        ("   5.3", "Rincian Proses: Mana Otomatis, Mana Manual", "10"),
        ("6", "Hubungan Antar Modul", "11"),
    ]

    toc_data = []
    for num, title, page in toc_items:
        is_sub = num.startswith("   ")
        toc_data.append([
            Paragraph(f"<b>{num.strip()}</b>", ParagraphStyle(
                "toc_num", fontName="Helvetica-Bold" if not is_sub else "Helvetica",
                fontSize=10, textColor=WitBlue if not is_sub else WitGray, leading=16
            )),
            Paragraph(title, ParagraphStyle(
                "toc_title", fontName="Helvetica-Bold" if not is_sub else "Helvetica",
                fontSize=10, textColor=WitDark if not is_sub else WitGray, leading=16
            )),
            Paragraph(page, ParagraphStyle(
                "toc_pg", fontName="Helvetica", fontSize=10, textColor=WitGray,
                alignment=TA_LEFT, leading=16
            )),
        ])

    toc_table = Table(toc_data, colWidths=[1.5*cm, 13*cm, 2*cm])
    toc_table.setStyle(TableStyle([
        ("TOPPADDING", (0,0), (-1,-1), 4),
        ("BOTTOMPADDING", (0,0), (-1,-1), 4),
        ("LEFTPADDING", (0,0), (-1,-1), 0),
        ("RIGHTPADDING", (0,0), (-1,-1), 0),
        ("LINEBELOW", (0,-1), (-1,-1), 0.5, WitBorder),
    ]))
    story.append(toc_table)

    story.append(PageBreak())


def section_header(title, styles):
    items = []
    items.append(Paragraph(title, styles["h1"]))
    items.append(HRFlowable(width="100%", thickness=1.5, color=WitBlue, spaceAfter=12))
    return items


def callout_box(text, bg_color, styles):
    """A highlighted callout/note box."""
    data = [[Paragraph(text, styles["note"])]]
    t = Table(data, colWidths=[PAGE_W - 4*cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), bg_color),
        ("BOX", (0,0), (-1,-1), 1, WitBorder),
        ("TOPPADDING", (0,0), (-1,-1), 8),
        ("BOTTOMPADDING", (0,0), (-1,-1), 8),
        ("LEFTPADDING", (0,0), (-1,-1), 12),
        ("RIGHTPADDING", (0,0), (-1,-1), 12),
    ]))
    return t


def flow_table(rows, col_widths, styles):
    """Renders a user-flow table with step numbers, arrows, and descriptions."""
    data = []
    for i, (step, desc, badge, badge_color) in enumerate(rows):
        badge_p = Paragraph(f"<b>{badge}</b>", ParagraphStyle(
            f"flowbadge_{i}", fontName="Helvetica-Bold", fontSize=8,
            textColor=white, alignment=TA_CENTER, leading=10, backColor=badge_color,
            borderPad=2,
        ))
        num_p = Paragraph(f"<b>{step}</b>", ParagraphStyle(
            f"flownum_{i}", fontName="Helvetica-Bold", fontSize=12,
            textColor=WitBlue, alignment=TA_CENTER, leading=16,
        ))
        desc_p = Paragraph(desc, styles["body"])
        data.append([num_p, desc_p, badge_p])

    t = Table(data, colWidths=col_widths)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), WitLight),
        ("BOX", (0,0), (-1,-1), 1, WitBorder),
        ("INNERGRID", (0,0), (-1,-1), 0.5, WitBorder),
        ("TOPPADDING", (0,0), (-1,-1), 8),
        ("BOTTOMPADDING", (0,0), (-1,-1), 8),
        ("LEFTPADDING", (0,0), (0,-1), 8),
        ("LEFTPADDING", (1,0), (1,-1), 8),
        ("RIGHTPADDING", (0,0), (-1,-1), 8),
        ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
        ("ROWBACKGROUNDS", (0,0), (-1,-1), [WitLight, white]),
    ]))
    return t


def input_table(rows, styles):
    """Table: Field Name | Manual Input | Auto dari Sistem | Keterangan"""
    header = [
        Paragraph("Nama Field", styles["table_header"]),
        Paragraph("Input Manual", styles["table_header"]),
        Paragraph("Auto dari Sistem", styles["table_header"]),
        Paragraph("Keterangan", styles["table_header"]),
    ]
    data = [header]
    for name, manual, auto, note in rows:
        data.append([
            Paragraph(name, styles["table_cell_bold"]),
            Paragraph("✔ Ya" if manual else "—", ParagraphStyle(
                "chk_y", fontName="Helvetica-Bold", fontSize=9, textColor=WitGreen if manual else WitGray,
                alignment=TA_CENTER, leading=13
            )) if manual is not None else Paragraph("—", styles["table_cell"]),
            Paragraph("✔ Ya" if auto else "—", ParagraphStyle(
                "chk_a", fontName="Helvetica-Bold", fontSize=9, textColor=WitBlue if auto else WitGray,
                alignment=TA_CENTER, leading=13
            )) if auto is not None else Paragraph("—", styles["table_cell"]),
            Paragraph(note, styles["table_cell"]),
        ])

    t = Table(data, colWidths=[4.5*cm, 2.5*cm, 3*cm, 6.5*cm])
    style = TableStyle([
        ("BACKGROUND", (0,0), (-1,0), WitBlue),
        ("BOX", (0,0), (-1,-1), 1, WitBorder),
        ("INNERGRID", (0,0), (-1,-1), 0.5, WitBorder),
        ("TOPPADDING", (0,0), (-1,-1), 6),
        ("BOTTOMPADDING", (0,0), (-1,-1), 6),
        ("LEFTPADDING", (0,0), (-1,-1), 8),
        ("RIGHTPADDING", (0,0), (-1,-1), 8),
        ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
        ("ROWBACKGROUNDS", (0,1), (-1,-1), [WitLight, white]),
    ])
    t.setStyle(style)
    return t


def build_section1(story, styles):
    story.extend(section_header("1. Pendahuluan", styles))

    story.append(Paragraph(
        "Dokumen ini merupakan pedoman penggunaan (User Guideline) untuk modul After Sales "
        "yang merupakan bagian dari aplikasi internal W-System yang dikembangkan oleh WIT.ID. "
        "Modul After Sales dirancang untuk mengelola hubungan pós-penjualan dengan client, "
        "memantau kepuasan client, serta menjaga komunikasi berkala setelah project atau "
        "ticket ditutup oleh tim internal.",
        styles["body"]
    ))
    story.append(Spacer(1, 0.3*cm))

    story.append(Paragraph("1.1  Tujuan Dokumen", styles["h2"]))
    story.append(Paragraph(
        "Pedoman ini bertujuan untuk:",
        styles["body"]
    ))
    for item in [
        "Menjelaskan alur kerja setiap modul secara jelas dan terstruktur.",
        "Memberikan panduan teknis mengenai field mana yang diinput secara manual oleh user "
        "dan field mana yang terisi otomatis dari sistem atau modul lain.",
        "Menjadi acuan bagi tim After Sales, Account Manager, dan PIC dalam menggunakan "
        "modul After Sales secara konsisten.",
        "Menunjukkan hubungan dan integrasi antar modul dalam ekosistem W-System.",
    ]:
        story.append(Paragraph(f"• {item}", styles["bullet"]))

    story.append(Spacer(1, 0.3*cm))
    story.append(Paragraph("1.2  Ruang Lingkup", styles["h2"]))
    story.append(Paragraph(
        "Dokumen ini mencakup tiga modul utama dalam After Sales:",
        styles["body"]
    ))
    for item in [
        "<b>Modul 1 — Client Relationship Tracking (US-AFTER-001)</b>: Memantau dan mengelola "
        "relasi dengan client pós-sale.",
        "<b>Modul 2 — Auto Survey (US-AFTER-002)</b>: Mengirimkan survey otomatis ke client "
        "dan mereview hasil survey.",
        "<b>Modul 3 — Pengumuman & Update ke Client (US-AFTER-003)</b>: Mengirimkan pengumuman "
        "atau notifikasi ke client.",
    ]:
        story.append(Paragraph(f"• {item}", styles["bullet"]))

    story.append(PageBreak())


def build_section2(story, styles):
    story.extend(section_header("2. Ringkasan Modul After Sales", styles))

    # Summary table
    header = [
        Paragraph("Modul", styles["table_header"]),
        Paragraph("User Story ID", styles["table_header"]),
        Paragraph("Trigger", styles["table_header"]),
        Paragraph("Output Utama", styles["table_header"]),
        Paragraph("Input<br/>Manual", styles["table_header"]),
        Paragraph("Sistem<br/>Otomatis", styles["table_header"]),
    ]
    rows = [
        ["Client Relationship<br/>Tracking", "US-AFTER-001",
         "Manual (PIC menambahkan<br/>catatan kontak)",
         "Update last contact &<br/>next follow-up per project",
         "✔", "—"],
        ["Auto Survey", "US-AFTER-002",
         "Otomatis saat<br/>project/ticket closed",
         "Response survey<br/>+ sentiment review",
         "✔", "✔"],
        ["Pengumuman &<br/>Update ke Client", "US-AFTER-003",
         "Manual (PIC buat<br/>pengumuman)",
         "Pengumuman terkirim<br/>+ tracking read receipt",
         "✔", "✔"],
    ]
    data = [header]
    for r in rows:
        data.append([
            Paragraph(r[0], styles["table_cell"]),
            Paragraph(r[1], styles["table_cell"]),
            Paragraph(r[2], styles["table_cell"]),
            Paragraph(r[3], styles["table_cell"]),
            Paragraph(f"<b>{r[4]}</b>", ParagraphStyle("g", fontName="Helvetica-Bold",
                fontSize=9, alignment=TA_CENTER, textColor=WitGreen, leading=13)),
            Paragraph(f"<b>{r[5]}</b>", ParagraphStyle("b", fontName="Helvetica-Bold",
                fontSize=9, alignment=TA_CENTER, textColor=WitBlue, leading=13)),
        ])

    t = Table(data, colWidths=[3.2*cm, 2.8*cm, 3*cm, 3.5*cm, 1.7*cm, 1.7*cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), WitBlue),
        ("BOX", (0,0), (-1,-1), 1, WitBorder),
        ("INNERGRID", (0,0), (-1,-1), 0.5, WitBorder),
        ("TOPPADDING", (0,0), (-1,-1), 6),
        ("BOTTOMPADDING", (0,0), (-1,-1), 6),
        ("LEFTPADDING", (0,0), (-1,-1), 6),
        ("RIGHTPADDING", (0,0), (-1,-1), 6),
        ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
        ("ROWBACKGROUNDS", (0,1), (-1,-1), [WitLight, white]),
    ]))
    story.append(t)
    story.append(Spacer(1, 0.4*cm))
    story.append(callout_box(
        "✔ Input Manual = User/PIC menginput langsung melalui form di aplikasi.<br/>"
        "✔ Sistem Otomatis = Sistem mengisi secara otomatis tanpa input manual user.",
        WitLight, styles
    ))
    story.append(PageBreak())


def build_section3(story, styles):
    story.extend(section_header("3. Modul 1 — Client Relationship Tracking (US-AFTER-001)", styles))

    # 3.1
    story.append(Paragraph("3.1  Tujuan & Deskripsi", styles["h2"]))
    story.append(Paragraph(
        "Modul Client Relationship Tracking dirancang untuk memungkinkan PIC (Person In Charge) "
        "atau tim After Sales memantau dan mengelola relasi pós-sale dengan setiap client. "
        "Setiap client dapat memiliki lebih dari satu project aktif, dan setiap project memiliki "
        "data hubungan masing-masing yang dipantau secara independen.",
        styles["body"]
    ))
    story.append(Paragraph(
        "Modul ini berfungsi sebagai pusat informasi hubungan dengan client, di mana PIC dapat "
        "mencatat setiap interaksi, melihat riwayat komunikasi, serta menjadwalkan follow-up "
        "berdasarkan project.",
        styles["body"]
    ))

    # 3.2
    story.append(Paragraph("3.2  Alur Kerja (User Flow)", styles["h2"]))

    flow_rows = [
        ("1", "PIC membuka menu <b>Client Relationship</b> di sidebar After Sales.", "Sistem", WitGray),
        ("2", "Dashboard menampilkan daftar semua client yang sudah deal.", "Sistem", WitBlue),
        ("3", "PIC dapat memfilter client berdasarkan: <b>Status Relasi</b>, <b>PIC</b>, "
              "dan <b>Retainer Aktif</b>. PIC juga dapat mencari client melalui <b>search bar</b>.",
         "Sistem", WitBlue),
        ("4", "PIC klik nama client → masuk ke halaman <b>Detail Client</b>.",
         "Sistem", WitGray),
        ("5", "Di halaman Detail Client, PIC dapat melihat: info ringkas client, "
              "daftar project dengan last contact & next follow-up masing-masing, "
              "serta expand per project untuk melihat riwayat log kontak.",
         "Sistem", WitBlue),
        ("6", "PIC klik tombol <b>\"Tambah Catatan Kontak\"</b>.",
         "User", WitOrange),
        ("7", "Form <b>Tambah Catatan Kontak</b> muncul. PIC mengisi semua field secara manual.", "User", WitOrange),
        ("8", "PIC klik <b>Simpan</b>. Sistem mengupdate field <b>Last Contact</b> "
              "dan <b>Next Follow-Up</b> untuk project yang dipilih.", "Sistem", WitBlue),
    ]
    story.append(flow_table(flow_rows, [1.5*cm, 11.5*cm, 3*cm], styles))
    story.append(Spacer(1, 0.3*cm))

    # Legend
    leg_data = [
        [
            Paragraph("<b>Legends:</b>", styles["body_sm"]),
            Paragraph("<b>User</b> = aksi yang dilakukan secara manual oleh PIC", ParagraphStyle(
                "leg1", fontName="Helvetica", fontSize=8, textColor=WitOrange, leading=11)),
            Paragraph("<b>Sistem</b> = proses yang dilakukan/dikelola oleh sistem", ParagraphStyle(
                "leg2", fontName="Helvetica", fontSize=8, textColor=WitBlue, leading=11)),
            Paragraph("<b>✔</b> = input manual user    <b>—</b> = bukan input manual", ParagraphStyle(
                "leg3", fontName="Helvetica", fontSize=8, textColor=WitGray, leading=11)),
        ]
    ]
    leg_table = Table(leg_data, colWidths=[1.8*cm, 5*cm, 5.5*cm, 3.6*cm])
    leg_table.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), WitLight),
        ("BOX", (0,0), (-1,-1), 0.5, WitBorder),
        ("TOPPADDING", (0,0), (-1,-1), 5),
        ("BOTTOMPADDING", (0,0), (-1,-1), 5),
        ("LEFTPADDING", (0,0), (-1,-1), 8),
        ("RIGHTPADDING", (0,0), (-1,-1), 8),
        ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
    ]))
    story.append(leg_table)
    story.append(PageBreak())

    # 3.3
    story.extend(section_header("3.3  Detail Form Tambah Catatan Kontak", styles))
    story.append(Paragraph(
        "Form <b>Tambah Catatan Kontak</b> dapat diakses dari dua lokasi: "
        "(1) tombol di halaman Dashboard, dan (2) tombol di halaman Detail Client per project. "
        "Berikut adalah alur pengisian form:",
        styles["body"]
    ))
    story.append(Spacer(1, 0.3*cm))

    form_steps = [
        ("1", "<b>Pilih Client</b> — Pilih nama client dari dropdown list.", "User", WitOrange),
        ("2", "<b>Pilih Project</b> — Setelah memilih client, dropdown project akan "
              "muncul menampilkan semua project yang dimiliki client tersebut. "
              "PIC memilih project yang ingin dicatat interaksinya.",
         "User", WitOrange),
        ("3", "<b>Tanggal Kontak</b> — PIC mengisi tanggal kapan kontak/interaksi dilakukan.", "User", WitOrange),
        ("4", "<b>Channel</b> — PIC memilih channel komunikasi: <b>Telepon / WhatsApp / Meeting / Email</b>.", "User", WitOrange),
        ("5", "<b>Ringkasan</b> — PIC menuliskan ringkasan pembicaraan, hasil diskusi, dan next step.", "User", WitOrange),
        ("6", "<b>Last Contact</b> — PIC mengisi secara manual tanggal kontak terakhir dengan client "
              "untuk project ini. Field ini akan langsung mengupdate data project di sisi sistem.",
         "User", WitOrange),
        ("7", "<b>Next Follow-Up</b> — PIC mengisi secara manual tanggal jadwal kontak berikutnya "
              "untuk project ini. Field ini juga akan langsung mengupdate data project di sisi sistem.",
         "User", WitOrange),
        ("8", "PIC klik <b>Simpan</b>. Sistem menyimpan log kontak dan mengupdate "
              "field <b>lastContact</b> serta <b>nextFollowUp</b> pada project terkait.",
         "Sistem", WitBlue),
    ]
    story.append(flow_table(form_steps, [1.5*cm, 11.5*cm, 3*cm], styles))

    story.append(Spacer(1, 0.4*cm))
    story.append(callout_box(
        "<b>Penting:</b> Field <b>Last Contact</b> dan <b>Next Follow-Up</b> diisi secara "
        "manual oleh PIC melalui form Tambah Catatan Kontak. Kedua field ini berlaku "
        "<b>per project</b>, bukan per client. Artinya, satu client bisa memiliki "
        "beberapa project dengan last contact dan next follow-up yang berbeda-beda.",
        HexColor("#fff7ed"), styles
    ))

    story.append(Spacer(1, 0.4*cm))

    # 3.4
    story.append(Paragraph("3.4  Tabel Ringkasan: Input Manual vs Sistem", styles["h2"]))
    story.append(Paragraph(
        "Tabel berikut merangkum bagaimana setiap field di-modul Client Relationship "
        "Tracking diperoleh datanya:",
        styles["body"]
    ))
    story.append(Spacer(1, 0.2*cm))

    input_rows = [
        ("Nama Client",         True,  False, "Data utama client diambil dari database client (master data)."),
        ("PIC Client",          False, True,  "Terisi otomatis dari data master client."),
        ("Email & Telepon",     False, True,  "Terisi otomatis dari data master client."),
        ("Segment & Industri",  False, True,  "Terisi otomatis dari data master client."),
        ("Status Relasi",       False, True,  "Dihitung/diobserve oleh sistem berdasarkan skor relasi & aktivitas."),
        ("Skor Relasi (0–100)", False, True,  "Dihitung/diobserve oleh sistem berdasarkan aktivitas interaksi."),
        ("Retainer",            False, True,  "Terisi otomatis dari data master client (flag dari tim Sales)."),
        ("Revenue",             False, True,  "Terisi otomatis dari data transaksi/project terkait."),
        ("Total Project",       False, True,  "Terisi otomatis dari daftar project client."),
        ("Daftar Project",      False, True,  "Terisi otomatis dari daftar project yang dibuat oleh tim lain."),
        ("Last Contact\n(per project)", True, False,
         "Diinput manual oleh PIC melalui form Tambah Catatan Kontak. Tidak diambil dari sumber lain."),
        ("Next Follow-Up\n(per project)", True, False,
         "Diinput manual oleh PIC melalui form Tambah Catatan Kontak. Tidak diambil dari sumber lain."),
        ("Riwayat Log Kontak",  True,  False, "PIC menambahkan catatan kontak secara manual melalui form."),
        ("Tanggal Kontak",      True,  False, "Diinput manual oleh PIC melalui form Tambah Catatan Kontak."),
        ("Channel (Tipe)",       True,  False, "Diinput manual oleh PIC melalui form Tambah Catatan Kontak."),
        ("Ringkasan Kontak",    True,  False, "Diinput manual oleh PIC melalui form Tambah Catatan Kontak."),
    ]
    story.append(input_table(input_rows, styles))
    story.append(PageBreak())


def build_section4(story, styles):
    story.extend(section_header("4. Modul 2 — Auto Survey (US-AFTER-002)", styles))

    # 4.1
    story.append(Paragraph("4.1  Tujuan & Deskripsi", styles["h2"]))
    story.append(Paragraph(
        "Modul Auto Survey dirancang untuk secara otomatis mengirimkan survey kepuasan "
        "kepada client ketika sebuah project atau ticket ditutup oleh tim internal. "
        "Survey ini membantu tim After Sales收集 feedback dari client, menganalisis "
        "sentimen, dan menentukan langkah follow-up yang tepat.",
        styles["body"]
    ))
    story.append(Paragraph(
        "Survey dikirimkan melalui kanal digital (WhatsApp dan/atau Email) dengan tautan "
        "ke formulir yang responsif di perangkat mobile. Setelah client mengisi survey, "
        "tim After Sales dapat melakukan review dan menentukan aksi follow-up.",
        styles["body"]
    ))

    # 4.2
    story.append(Paragraph("4.2  Alur Kerja (User Flow)", styles["h2"]))

    flow_rows = [
        ("1", "Tim internal (misalnya Project Manager) <b>menutup project atau ticket</b>.", "Sistem", WitGray),
        ("2", "<b>Sistem mendeteksi</b> bahwa project/ticket telah ditutup. "
              "Sebagai <b>respons otomatis</b>, sistem memicu pengiriman survey.", "Sistem", WitBlue),
        ("3", "Client menerima <b>link survey</b> melalui WhatsApp dan/atau Email.", "Sistem", WitBlue),
        ("4", "Client membuka link dan mengisi <b>form survey</b> (9 pertanyaan, mobile-friendly).", "User", WitOrange),
        ("5", "Setelah disubmit, <b>response survey masuk</b> ke sistem dan tercatat.", "Sistem", WitBlue),
        ("6", "PIC/After Sales Team membuka menu <b>Auto Survey</b> di After Sales.", "User", WitOrange),
        ("7", "PIC melihat daftar semua survey response, dapat <b>filter</b> berdasarkan status.", "Sistem", WitBlue),
        ("8", "PIC klik salah satu response → halaman <b>Detail Survey</b>.", "User", WitOrange),
        ("9", "<b>Review jawaban client</b>, <b>edit/override sentiment</b> (Positive/Neutral/Negative), "
              "dan <b>assign PIC follow-up</b>.", "User", WitOrange),
        ("10", "PIC menandai survey: <b>Selesai</b> atau <b>Escalate</b> jika perlu tindakan lanjut.", "User", WitOrange),
    ]
    story.append(flow_table(flow_rows, [1.5*cm, 11.5*cm, 3*cm], styles))
    story.append(PageBreak())

    # 4.3
    story.extend(section_header("4.3  Rincian Proses: Mana Otomatis, Mana Manual", styles))
    story.append(Paragraph(
        "Tabel berikut menjelaskan field demi field, mana yang diinput manual oleh user "
        "dan mana yang terisi otomatis oleh sistem:",
        styles["body"]
    ))
    story.append(Spacer(1, 0.2*cm))

    input_rows = [
        ("Survey Trigger",       False, True,  "Sistem otomatis mendeteksi project/ticket yang ditutup dan memicu pengiriman survey."),
        ("Link Survey",           False, True,  "Sistem membuat dan mengirim link survey ke client secara otomatis."),
        ("Jawaban Survey\n(9 Pertanyaan)", True, False, "Diinput manual oleh client melalui form survey di perangkat mobile."),
        ("Nama Client",           False, True,  "Terisi otomatis dari data project/ticket yang tertutup."),
        ("Nama Project",          False, True,  "Terisi otomatis dari data project/ticket yang tertutup."),
        ("Tanggal Submit Survey", False, True,  "Terisi otomatis oleh sistem saat client submit form survey."),
        ("Status Survey",         False, True,  "Sistem otomatis meng-set status 'Belum Diresponse' atau 'Sudah Diresponse'."),
        ("Sentiment (Otomatis)",  False, True,  "Sistem secara otomatis menganalisis dan menentukan sentiment awal "
                                                "berdasarkan jawaban survey (Positive / Neutral / Negative)."),
        ("Sentiment (Override)",  True,  False, "PIC/After Sales Team dapat mengoverride sentiment hasil analisis "
                                                "sistem secara manual jika diperlukan."),
        ("PIC Follow-Up",         True,  False, "PIC After Sales Team mengassign diri sendiri atau PIC lain "
                                                "untuk melakukan follow-up. Diinput manual."),
        ("Catatan / Tindakan\nFollow-Up", True, False, "PIC menambahkan catatan mengenai tindakan yang perlu dilakukan "
                                                "berdasarkan hasil survey. Diinput manual."),
        ("Status Review",         True,  False, "PIC menandai review survey sebagai 'Selesai' atau 'Escalate'. "
                                                "Diinput manual."),
    ]
    story.append(input_table(input_rows, styles))
    story.append(Spacer(1, 0.3*cm))
    story.append(callout_box(
        "<b>Catatan Penting:</b> Auto Survey menggunakan kombinasi <b>otomatisasi sistem</b> "
        "(trigger, pengiriman, analisis sentiment awal) dan <b>input manual</b> "
        "(review jawaban, override sentiment, assign follow-up, catatan tindakan). "
        "Hal ini memastikan bahwa proses tetap efisien secara otomatis namun tetap "
        "memiliki sentuhan manusia untuk keputusan yang memerlukan penilaian lebih.",
        WitLight, styles
    ))
    story.append(PageBreak())


def build_section5(story, styles):
    story.extend(section_header("5. Modul 3 — Pengumuman & Update ke Client (US-AFTER-003)", styles))

    # 5.1
    story.append(Paragraph("5.1  Tujuan & Deskripsi", styles["h2"]))
    story.append(Paragraph(
        "Modul Pengumuman & Update ke Client memungkinkan tim After Sales dan PIC "
        "untuk mengkomunikasikan informasi penting kepada client secara terstruktur "
        "dan terukur. Informasi yang dapat dikomunikasikan meliputi: pengenalan fitur "
        "baru, peluncuran layanan baru, jadwal pemeliharaan sistem, serta undangan event.",
        styles["body"]
    ))
    story.append(Paragraph(
        "Berbeda dengan chat langsung, modul ini dirancang untuk komunikasi formal dan "
        "terdokumentasi yang dapat ditargetkan kepada segmentasi client tertentu, "
        "dijadwalkan, serta dipantau tingkat penerimaannya (read receipt tracking).",
        styles["body"]
    ))

    # 5.2
    story.append(Paragraph("5.2  Alur Kerja (User Flow)", styles["h2"]))

    flow_rows = [
        ("1", "PIC membuka menu <b>Pengumuman & Update</b> di sidebar After Sales.", "User", WitOrange),
        ("2", "Dashboard menampilkan daftar semua pengumuman dengan status: "
              "<b>Draft / Terjadwal / Terkirim / Archived</b>.", "Sistem", WitBlue),
        ("3", "PIC dapat memfilter pengumuman berdasarkan <b>Jenis</b> dan <b>Status</b>.", "Sistem", WitBlue),
        ("4", "PIC klik <b>\"Buat Pengumuman Baru\"</b> untuk membuat pengumuman baru.", "User", WitOrange),
        ("5", "PIC mengisi form pengumuman: <b>Judul</b>, <b>Jenis</b>, dan <b>Isi Pengumuman</b>.", "User", WitOrange),
        ("6", "PIC menentukan <b>Target Penerima</b>: semua client, segment tertentu, atau pilih manual.", "User", WitOrange),
        ("7", "Sistem menampilkan <b>preview jumlah penerima</b> secara dinamis sesuai target.", "Sistem", WitBlue),
        ("8", "PIC menentukan <b>Jadwal Kirim</b>: Kirim Sekarang atau Jadwalkan (tanggal & jam).", "User", WitOrange),
        ("9", "PIC memilih aksi: <b>Simpan Draft</b> / <b>Jadwalkan</b> / <b>Kirim Sekarang</b>.", "User", WitOrange),
        ("10", "Jika dijadwalkan, sistem secara <b>otomatis mengirim</b> pengumuman pada waktu "
               "yang telah ditentukan.", "Sistem", WitBlue),
        ("11", "Setelah terkirim, PIC dapat membuka halaman <b>Detail & Tracking</b>.", "User", WitOrange),
        ("12", "Halaman tracking menampilkan statistik: <b>Terkirim, Sudah Baca, Belum Baca, "
               "Klik Link</b>, serta progress bar readership.", "Sistem", WitBlue),
        ("13", "PIC dapat mengirim <b>Reminder</b> kepada client yang belum membaca.", "User", WitOrange),
        ("14", "PIC dapat <b>mengarsipkan</b> pengumuman yang sudah tidak aktif.", "User", WitOrange),
    ]
    story.append(flow_table(flow_rows, [1.5*cm, 11.5*cm, 3*cm], styles))
    story.append(PageBreak())

    # 5.3
    story.extend(section_header("5.3  Rincian Proses: Mana Otomatis, Mana Manual", styles))
    story.append(Paragraph(
        "Tabel berikut merangkum field demi field untuk modul Pengumuman & Update ke Client:",
        styles["body"]
    ))
    story.append(Spacer(1, 0.2*cm))

    input_rows = [
        ("Judul Pengumuman",     True,  False, "Diinput manual oleh PIC melalui form Buat Pengumuman."),
        ("Jenis Pengumuman",      True,  False, "PIC memilih jenis: Fitur Baru / Pelayanan Baru / "
                                                  "Info Pemeliharaan / Undangan Event. Diinput manual."),
        ("Isi / Konten",         True,  False, "Diinput manual oleh PIC melalui form. Ini adalah "
                                                  "teks utama pengumuman."),
        ("Target Penerima\n(Semua/Segment/Manual)", True, False,
         "PIC memilih target secara manual. Jika 'Pilih Manual', PIC mencentang client satu per satu."),
        ("Preview Jumlah\nPenerima",  False, True,  "Sistem menghitung dan menampilkan jumlah penerima "
                                                     "secara otomatis berdasarkan target yang dipilih."),
        ("Jadwal Kirim\n(Kirim Sekarang / Jadwalkan)", True, False,
         "PIC memilih mode pengiriman secara manual. Jika 'Jadwalkan', PIC mengisi tanggal dan jam."),
        ("Waktu Pengiriman\n(Otomatis)",  False, True,  "Jika dijadwalkan, sistem secara otomatis mengirim "
                                                           "pengumuman pada waktu yang telah ditentukan."),
        ("Status Pengumuman\n(Draft/Terjadwal/Terkirim/Archived)", False, True,
         "Sistem mengelola status pengumuman secara otomatis sesuai aksi yang dilakukan."),
        ("Statistik Tracking\n(Terkirim/Sudah Baca/Belum Baca/Klik Link)", False, True,
         "Sistem menghitung dan memperbarui statistik ini secara otomatis berdasarkan "
         "data read receipt dari client."),
        ("Progress Bar\nReadership",  False, True,  "Sistem menghitung persentase client yang sudah membaca "
                                                      "dan menampilkan progress bar secara otomatis."),
        ("Timestamp Kirim",       False, True,  "Sistem mencatat waktu pasti pengiriman secara otomatis."),
        ("Waktu Baca\n(per Client)", False, True,  "Sistem mencatat waktu ketika client membuka/membaca "
                                                    "pengumuman secara otomatis."),
        ("Kirim Reminder",        True,  False, "PIC mengklik tombol 'Kirim Reminder' secara manual "
                                                  "untuk client yang belum membaca."),
        ("Arsipkan",              True,  False, "PIC mengklik tombol 'Arsipkan' secara manual ketika "
                                                  "pengumuman sudah tidak diperlukan lagi."),
    ]
    story.append(input_table(input_rows, styles))
    story.append(Spacer(1, 0.3*cm))
    story.append(callout_box(
        "<b>Ringkasan:</b> Sebagian besar aktivitas di modul Pengumuman & Update "
        "membutuhkan <b>input manual</b> dari PIC (membuat, menentukan target, menjadwalkan, "
        "mengirim reminder, mengarsipkan), sedangkan <b>pengiriman otomatis</b>, "
        "<b>tracking</b>, dan <b>statistik</b> dikelola oleh sistem.",
        WitLight, styles
    ))
    story.append(PageBreak())


def build_section6(story, styles):
    story.extend(section_header("6. Hubungan Antar Modul After Sales", styles))

    story.append(Paragraph(
        "Ketiga modul After Sales tidak berdiri sendiri, melainkan saling terhubung dalam "
        "satu ekosistem manajemen hubungan client pós-sale. Berikut adalah hubungan antar modul:",
        styles["body"]
    ))
    story.append(Spacer(1, 0.3*cm))

    # Relationship diagram table
    rel_data = [
        [Paragraph("<b>Modul</b>", styles["table_header"]),
         Paragraph("<b>Modul yang Terkait</b>", styles["table_header"]),
         Paragraph("<b>Jenis Hubungan</b>", styles["table_header"]),
         Paragraph("<b>Penjelasan</b>", styles["table_header"])],
        [Paragraph("Modul 2: Auto Survey", styles["table_cell_bold"]),
         Paragraph("Modul 1: Client Relationship", styles["table_cell"]),
         Paragraph("✔️ Alur Lanjutan", ParagraphStyle("rel1", fontName="Helvetica-Bold",
             fontSize=9, textColor=WitBlue, leading=13)),
         Paragraph("Setelah Auto Survey ditutup (client merespons), "
                   "PIC dapat membuka Modul 1 untuk menambahkan "
                   "catatan kontak terkait hasil survey tersebut.",
                   styles["table_cell"])],
        [Paragraph("Modul 1: Client Relationship", styles["table_cell_bold"]),
         Paragraph("Modul 3: Pengumuman", styles["table_cell"]),
         Paragraph("✔️ Komunikasi", ParagraphStyle("rel2", fontName="Helvetica-Bold",
             fontSize=9, textColor=WitBlue, leading=13)),
         Paragraph("PIC dapat mengirim pengumuman (Modul 3) "
                   "kepada client yang sedang dipantau relasinya "
                   "di Modul 1. Target dapat disetting manual "
                   "untuk client tertentu.",
                   styles["table_cell"])],
        [Paragraph("Modul 2: Auto Survey", styles["table_cell_bold"]),
         Paragraph("Modul 3: Pengumuman", styles["table_cell"]),
         Paragraph("✔️ Peringatan", ParagraphStyle("rel3", fontName="Helvetica-Bold",
             fontSize=9, textColor=WitBlue, leading=13)),
         Paragraph("Setelah hasil survey dievaluasi (Modul 2), "
                   "jika ditemukan client yang At Risk atau perlu "
                   "perhatian khusus, PIC dapat mengirim pengumuman "
                   "peringatan atau informasi penting melalui Modul 3.",
                   styles["table_cell"])],
        [Paragraph("Semua Modul", styles["table_cell_bold"]),
         Paragraph("Master Client Data", styles["table_cell"]),
         Paragraph("📌 Ketergantungan Data", ParagraphStyle("rel4", fontName="Helvetica-Bold",
             fontSize=9, textColor=WitPurple, leading=13)),
         Paragraph("Ketiga modul mengambil data client dasar "
                   "(nama, email, PIC, retainer, segment) dari "
                   "master data client yang dikelola oleh tim Sales "
                   "dan Account Manager.",
                   styles["table_cell"])],
        [Paragraph("Modul 1: Client Relationship", styles["table_cell_bold"]),
         Paragraph("Project/Ticket (tim lain)", styles["table_cell"]),
         Paragraph("📌 Sumber Data Project", ParagraphStyle("rel5", fontName="Helvetica-Bold",
             fontSize=9, textColor=WitPurple, leading=13)),
         Paragraph("Daftar project di Client Relationship (Modul 1) "
                   "berasal dari project/ticket yang dibuat oleh tim lain "
                   "(Project Manager / Developer).",
                   styles["table_cell"])],
        [Paragraph("Modul 2: Auto Survey", styles["table_cell_bold"]),
         Paragraph("Project/Ticket (tim lain)", styles["table_cell"]),
         Paragraph("⚡ Trigger Otomatis", ParagraphStyle("rel6", fontName="Helvetica-Bold",
             fontSize=9, textColor=WitOrange, leading=13)),
         Paragraph("Modul Auto Survey triggered secara otomatis "
                   "saat project/ticket ditutup oleh tim lain. "
                   "Ini adalah satu-satunya proses otomatis penuh "
                   "dalam ekosistem After Sales.",
                   styles["table_cell"])],
    ]

    rel_table = Table(rel_data, colWidths=[3.5*cm, 3.5*cm, 3*cm, 6.5*cm])
    rel_table.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), WitBlue),
        ("BOX", (0,0), (-1,-1), 1, WitBorder),
        ("INNERGRID", (0,0), (-1,-1), 0.5, WitBorder),
        ("TOPPADDING", (0,0), (-1,-1), 7),
        ("BOTTOMPADDING", (0,0), (-1,-1), 7),
        ("LEFTPADDING", (0,0), (-1,-1), 8),
        ("RIGHTPADDING", (0,0), (-1,-1), 8),
        ("VALIGN", (0,0), (-1,-1), "TOP"),
        ("ROWBACKGROUNDS", (0,1), (-1,-1), [WitLight, white]),
    ]))
    story.append(rel_table)

    story.append(Spacer(1, 0.5*cm))

    # End note
    story.append(callout_box(
        "<b>Catatan Akhir:</b> Dokumen ini akan diperbarui secara berkala sesuai dengan "
        "perkembangan modul After Sales di W-System. Untuk pertanyaan atau klarifikasi "
        "mengenai pedoman ini, silakan hubungi tim After Sales atau tim Development.",
        WitLight, styles
    ))


def add_page_footer(canvas, doc):
    """Add page number footer to each page."""
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(WitGray)
    page_num = canvas.getPageNumber()
    text = f"WIT.ID — W-System After Sales Module — User Guideline  |  Halaman {page_num}"
    canvas.drawCentredString(PAGE_W / 2, 0.75*cm, text)
    # Top blue line
    canvas.setStrokeColor(WitBlue)
    canvas.setLineWidth(1.5)
    canvas.line(2*cm, PAGE_H - 1.2*cm, PAGE_W - 2*cm, PAGE_H - 1.2*cm)
    canvas.restoreState()


def main():
    output_path = "/home/ubuntu/apps/wsystem-1/docs/After-Sales-User-Guideline.pdf"

    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        leftMargin=2*cm,
        rightMargin=2*cm,
        topMargin=1.8*cm,
        bottomMargin=1.5*cm,
        title="After Sales Module — User Guideline",
        author="WIT.ID After Sales Team",
        subject="Pedoman Penggunaan Modul After Sales W-System",
    )

    styles = build_styles()
    story = []

    # Build all sections
    build_cover(story, styles)
    build_toc(story, styles)
    build_section1(story, styles)
    build_section2(story, styles)
    build_section3(story, styles)
    build_section4(story, styles)
    build_section5(story, styles)
    build_section6(story, styles)

    doc.build(story, onFirstPage=add_page_footer, onLaterPages=add_page_footer)
    print(f"PDF generated: {output_path}")


if __name__ == "__main__":
    main()
