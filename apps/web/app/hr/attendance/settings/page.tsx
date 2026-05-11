"use client"

import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@workspace/ui/components/card"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Switch,
} from "@workspace/ui/components/switch"
import { Separator } from "@workspace/ui/components/separator"
import { useState, useEffect } from "react"
import { Save, MapPin, Clock, RotateCcw, Camera, Settings } from "lucide-react"

interface AttendanceSettings {
  office_location: string
  lat: string
  lng: string
  radius_meters: number
  work_hours_start: string
  work_hours_end: string
  grace_period_minutes: number
  max_late_minutes: number
  required_checkins_per_day: number
  require_photo_checkin: boolean
  require_gps: boolean
}

const defaultSettings: AttendanceSettings = {
  office_location: "Head Office Bandung",
  lat: "-6.9147",
  lng: "107.6098",
  radius_meters: 100,
  work_hours_start: "09:00",
  work_hours_end: "18:00",
  grace_period_minutes: 15,
  max_late_minutes: 30,
  required_checkins_per_day: 2,
  require_photo_checkin: true,
  require_gps: true,
}

export default function AttendanceSettingsPage() {
  const [settings, setSettings] = useState<AttendanceSettings>(defaultSettings)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Load from API (mock for now)
  useEffect(() => {
    fetch("/api/attendance/settings")
      .then(r => { if (r.ok) return r.json(); throw new Error("Mock fail") })
      .then(d => { if (d.success) setSettings(d.data) })
      .catch(() => { /* keep default */ })
  }, [])

  function update(key: keyof AttendanceSettings, value: any) {
    setSettings(prev => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    // Mock save
    await new Promise(r => setTimeout(r, 800))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  function handleReset() {
    setSettings(defaultSettings)
    setSaved(false)
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Attendance Settings</h1>
        <p className="text-muted-foreground flex items-center gap-2 mt-1">
          <Settings className="h-4 w-4" /> Konfigurasi absensi & lokasi kantor
        </p>
      </div>

      {/* Office Location */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-500" />
            <CardTitle>Lokasi Kantor</CardTitle>
          </div>
          <CardDescription>Atur lokasi kantor & radius GPS</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="office_location">Nama Lokasi</Label>
              <Input id="office_location" value={settings.office_location} onChange={e => update("office_location", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="radius">Radius GPS (meter)</Label>
              <Input id="radius" type="number" value={settings.radius_meters} onChange={e => update("radius_meters", parseInt(e.target.value) || 0)} />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="lat">Latitude</Label>
              <Input id="lat" value={settings.lat} onChange={e => update("lat", e.target.value)} placeholder="-6.9147" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lng">Longitude</Label>
              <Input id="lng" value={settings.lng} onChange={e => update("lng", e.target.value)} placeholder="107.6098" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Radius: {settings.radius_meters}m dari koordinat <b>{settings.lat}, {settings.lng}</b>
          </p>
        </CardContent>
      </Card>

      {/* Work Hours */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-500" />
            <CardTitle>Jam Kerja</CardTitle>
          </div>
          <CardDescription>Atur jam masuk, keluar, & toleransi keterlambatan</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="start">Jam Masuk</Label>
              <Input id="start" type="time" value={settings.work_hours_start} onChange={e => update("work_hours_start", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end">Jam Keluar</Label>
              <Input id="end" type="time" value={settings.work_hours_end} onChange={e => update("work_hours_end", e.target.value)} />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="grace">Toleransi Terlambat (menit)</Label>
              <Input id="grace" type="number" value={settings.grace_period_minutes} onChange={e => update("grace_period_minutes", parseInt(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_late">Max Terlambat (menit)</Label>
              <Input id="max_late" type="number" value={settings.max_late_minutes} onChange={e => update("max_late_minutes", parseInt(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="checkins">Check-in Harian</Label>
              <Input id="checkins" type="number" min={1} max={4} value={settings.required_checkins_per_day} onChange={e => update("required_checkins_per_day", parseInt(e.target.value) || 1)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requirements */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-purple-500" />
            <CardTitle>Persyaratan Check-in</CardTitle>
          </div>
          <CardDescription>Aktifkan validasi saat check-in</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label>Wajib Foto</Label>
              <p className="text-xs text-muted-foreground">Karyawan harus upload foto saat check-in</p>
            </div>
            <Switch checked={settings.require_photo_checkin} onCheckedChange={v => update("require_photo_checkin", v)} />
          </div>
          <Separator />
          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label>Wajib GPS</Label>
              <p className="text-xs text-muted-foreground">Validasi lokasi GPS harus dalam radius kantor</p>
            </div>
            <Switch checked={settings.require_gps} onCheckedChange={v => update("require_gps", v)} />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Menyimpan..." : saved ? "✅ Tersimpan!" : "Simpan Perubahan"}
        </Button>
        <Button variant="outline" onClick={handleReset}>
          <RotateCcw className="h-4 w-4 mr-2" /> Reset Default
        </Button>
      </div>
    </div>
  )
}
