"use client"

import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"
import { Separator } from "@workspace/ui/components/separator"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useState } from "react"
import {
  ArrowLeft, Mail, Phone, MapPin, Building2, Calendar,
  GraduationCap, Heart, Briefcase, Award, ShieldAlert, Wrench,
} from "lucide-react"

// Extended user data
const userProfileDB: Record<string, UserProfile> = {
  "usr-001": {
    id: "usr-001", name: "John Doe", email: "john.doe@wit.id", phone: "+62 812-3456-7890",
    position: "Senior Developer", department: "Engineering", joinDate: "2023-01-15",
    status: "Active", address: "Jl. Setiabudi No. 45, Bandung",
    avatar: "https://ui-avatars.com/api/?name=John+Doe&background=0D8ABC&color=fff",
    summary: { employeeId: "EMP-001", npwp: "01.234.567.8-901.000", nik: "3201010101010001",
      birthDate: "1990-05-20", gender: "Male", bloodType: "O", religion: "Islam",
      maritalStatus: "Married", nationality: "Indonesian",
    },
    family: [
      { name: "Jane Doe", relationship: "Wife", phone: "+62 813-4567-8901", occupation: "Teacher" },
      { name: "Tommy Doe", relationship: "Son", phone: "—", occupation: "Student" },
    ],
    education: [
      { level: "S1", institution: "ITB", major: "Computer Science", year: "2008-2012", gpa: "3.75" },
      { level: "S2", institution: "UI", major: "Information Technology", year: "2014-2016", gpa: "3.85" },
    ],
    experience: [
      { company: "PT. Tech Solutions", position: "Junior Developer", period: "2012-2015", description: "Developed internal tools and web applications." },
      { company: "PT. Digital Indonesia", position: "Mid-Level Developer", period: "2015-2020", description: "Led frontend team for e-commerce platform." },
      { company: "PT. Wira Inovasi Teknologi", position: "Senior Developer", period: "2023-Present", description: "Fullstack development for W.System platform." },
    ],
    skills: ["React", "TypeScript", "Node.js", "PostgreSQL", "Docker", "AWS", "Next.js", "Tailwind CSS"],
    certifications: [
      { name: "AWS Certified Solutions Architect", issuer: "Amazon", date: "2022-03-15", expiry: "2025-03-15" },
      { name: "Google Cloud Professional", issuer: "Google", date: "2021-08-10", expiry: "2024-08-10" },
    ],
    emergency: [
      { name: "Jane Doe", relationship: "Wife", phone: "+62 813-4567-8901" },
      { name: "Robert Doe", relationship: "Father", phone: "+62 811-2345-6789" },
    ],
  },
}

interface UserProfile {
  id: string
  name: string
  email: string
  phone: string
  position: string
  department: string
  joinDate: string
  status: string
  address: string
  avatar: string
  summary: SummaryData
  family: FamilyMember[]
  education: Education[]
  experience: Experience[]
  skills: string[]
  certifications: Certification[]
  emergency: EmergencyContact[]
}

interface SummaryData {
  employeeId: string
  npwp: string
  nik: string
  birthDate: string
  gender: string
  bloodType: string
  religion: string
  maritalStatus: string
  nationality: string
}

interface FamilyMember { name: string; relationship: string; phone: string; occupation: string }
interface Education { level: string; institution: string; major: string; year: string; gpa: string }
interface Experience { company: string; position: string; period: string; description: string }
interface Certification { name: string; issuer: string; date: string; expiry: string }
interface EmergencyContact { name: string; relationship: string; phone: string }

export default function UserProfilePage() {
  const params = useParams()
  const userId = params.id as string
  const [profile] = useState<UserProfile | null>(userProfileDB[userId] || null)

  if (!profile) {
    return (
      <div className="p-6">
        <Button variant="ghost" asChild>
          <Link href="/hr/master/users"><ArrowLeft className="h-4 w-4 mr-2" />Kembali</Link>
        </Button>
        <div className="mt-8 text-center text-muted-foreground">Profil tidak ditemukan</div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Back + Header */}
      <Button variant="ghost" asChild>
        <Link href="/hr/master/users"><ArrowLeft className="h-4 w-4 mr-2" />Kembali ke Daftar</Link>
      </Button>

      {/* Profile Hero */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <Avatar className="h-24 w-24">
              <AvatarImage src={profile.avatar} />
              <AvatarFallback className="text-2xl">{profile.name.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <h1 className="text-2xl font-bold">{profile.name}</h1>
                <Badge variant={profile.status === "Active" ? "default" : "secondary"}>{profile.status}</Badge>
              </div>
              <p className="text-muted-foreground">{profile.position} • {profile.department}</p>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Mail className="h-4 w-4" /> {profile.email}</span>
                <span className="flex items-center gap-1"><Phone className="h-4 w-4" /> {profile.phone}</span>
                <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {profile.address}</span>
                <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> Join: {profile.joinDate}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Tabs */}
      <Tabs defaultValue="summary">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="family">Family</TabsTrigger>
          <TabsTrigger value="education">Education</TabsTrigger>
          <TabsTrigger value="experience">Experience</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="certifications">Certs</TabsTrigger>
          <TabsTrigger value="emergency">Emergency</TabsTrigger>
        </TabsList>

        {/* Summary */}
        <TabsContent value="summary">
          <Card>
            <CardHeader>
              <CardTitle>Informasi Pribadi</CardTitle>
              <CardDescription>Data identitas dan informasi dasar karyawan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div><p className="text-sm text-muted-foreground">Employee ID</p><p className="font-medium">{profile.summary.employeeId}</p></div>
                <div><p className="text-sm text-muted-foreground">NPWP</p><p className="font-medium">{profile.summary.npwp}</p></div>
                <div><p className="text-sm text-muted-foreground">NIK</p><p className="font-medium">{profile.summary.nik}</p></div>
                <div><p className="text-sm text-muted-foreground">Tanggal Lahir</p><p className="font-medium">{profile.summary.birthDate}</p></div>
                <div><p className="text-sm text-muted-foreground">Jenis Kelamin</p><p className="font-medium">{profile.summary.gender}</p></div>
                <div><p className="text-sm text-muted-foreground">Golongan Darah</p><p className="font-medium">{profile.summary.bloodType}</p></div>
                <div><p className="text-sm text-muted-foreground">Agama</p><p className="font-medium">{profile.summary.religion}</p></div>
                <div><p className="text-sm text-muted-foreground">Status Perkawinan</p><p className="font-medium">{profile.summary.maritalStatus}</p></div>
                <div><p className="text-sm text-muted-foreground">Kewarganegaraan</p><p className="font-medium">{profile.summary.nationality}</p></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Family */}
        <TabsContent value="family">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Heart className="h-5 w-5 text-rose-500" /> Data Keluarga</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {profile.family.map((m, i) => (
                <div key={i} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{m.name}</div>
                    <Badge variant="outline">{m.relationship}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground flex gap-4">
                    <span><Phone className="h-3 w-3 inline mr-1" />{m.phone}</span>
                    <span><Briefcase className="h-3 w-3 inline mr-1" />{m.occupation}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Education */}
        <TabsContent value="education">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><GraduationCap className="h-5 w-5 text-blue-500" /> Riwayat Pendidikan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {profile.education.map((e, i) => (
                <div key={i} className="border rounded-lg p-4 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{e.level} — {e.major}</div>
                    <Badge variant="secondary">GPA {e.gpa}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">{e.institution} • {e.year}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Experience */}
        <TabsContent value="experience">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Briefcase className="h-5 w-5 text-amber-500" /> Pengalaman Kerja</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {profile.experience.map((e, i) => (
                <div key={i} className="border rounded-lg p-4 space-y-1">
                  <div className="font-medium">{e.position}</div>
                  <div className="text-sm text-muted-foreground">{e.company} • {e.period}</div>
                  <div className="text-sm">{e.description}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Skills */}
        <TabsContent value="skills">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Wrench className="h-5 w-5 text-purple-500" /> Skills & Expertise</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((s) => (
                  <Badge key={s} variant="secondary" className="text-sm px-3 py-1">{s}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Certifications */}
        <TabsContent value="certifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Award className="h-5 w-5 text-emerald-500" /> Sertifikasi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {profile.certifications.map((c, i) => (
                <div key={i} className="border rounded-lg p-4 space-y-1">
                  <div className="font-medium">{c.name}</div>
                  <div className="text-sm text-muted-foreground">Issuer: {c.issuer}</div>
                  <div className="text-sm text-muted-foreground">Issued: {c.date} • Expires: {c.expiry}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Emergency */}
        <TabsContent value="emergency">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-red-500" /> Kontak Darurat</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {profile.emergency.map((e, i) => (
                <div key={i} className="border rounded-lg p-4 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{e.name}</div>
                    <Badge variant="outline">{e.relationship}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground"><Phone className="h-3 w-3 inline mr-1" /> {e.phone}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
