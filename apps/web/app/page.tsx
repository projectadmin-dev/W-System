"use client"

import { LoginForm } from "@/components/login-form"

export default function LoginPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200">
      {/* Main Card - Centered */}
      <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl shadow-slate-200/50 border border-slate-200 p-8">
        <LoginForm />
      </div>
    </div>
  )
}
