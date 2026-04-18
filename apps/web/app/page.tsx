"use client"

import { LoginForm } from "@/components/login-form"
import SupabaseTest from "@/components/supabase-test"
import { GalleryVerticalEndIcon } from "lucide-react"

export default function LoginPage() {
    return (
        <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 p-4">
            <LoginForm />
        </div>
    )
}
