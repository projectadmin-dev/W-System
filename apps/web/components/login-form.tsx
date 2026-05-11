"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "../lib/supabase"
import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@workspace/ui/components/field"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const supabase = createClient()

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      setSuccess(true)
      router.push("/dashboard")
    } catch (err: any) {
      setError(err.message || "Login failed. Please check your credentials.")
    } finally {
      setLoading(false)
    }
  }

  const handleOAuthLogin = async (provider: "google" | "apple") => {
    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) throw error
    } catch (err: any) {
      setError(err.message || `${provider} login failed.`)
      setLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) throw error

      setSuccess(true)
      setError("Check your email for confirmation!")
    } catch (err: any) {
      setError(err.message || "Sign up failed.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={cn("w-full max-w-md mx-auto", className)} {...props}>
      {/* Logo */}
      <img 
        src="/logo.png" 
        alt="WIT. System Logo" 
        className="mx-auto mb-10 h-10 w-auto max-w-[180px] object-contain"
      />

      {/* Title */}
      <h2 className="text-2xl font-bold text-slate-800 text-center mb-2">Sampurasun</h2>
      <p className="text-slate-500 text-center text-sm mb-6">
        Sign in to your account to continue
      </p>

      <form onSubmit={handleEmailLogin}>
        <FieldGroup className="space-y-4">
          {/* Email Field */}
          <Field className="space-y-1.5">
            <FieldLabel htmlFor="email" className="text-sm font-medium text-slate-700">
              Email
            </FieldLabel>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              className="h-11 border-slate-200 bg-white/80 text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:ring-slate-400/20 transition-all duration-200"
            />
          </Field>

          {/* Password Field */}
          <Field className="space-y-1.5">
            <div className="flex items-center justify-between">
              <FieldLabel htmlFor="password" className="text-sm font-medium text-slate-700">
                Password
              </FieldLabel>
              <a
                href="#"
                className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-700 underline-offset-4 hover:underline"
              >
                Forgot password?
              </a>
            </div>
            <Input 
              id="password" 
              type="password" 
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
              disabled={loading}
              className="h-11 border-slate-200 bg-white/80 text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:ring-slate-400/20 transition-all duration-200"
            />
          </Field>

          {/* Error/Success Messages */}
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-100 p-3">
              <FieldDescription className="text-red-600 text-sm text-center">
                {error}
              </FieldDescription>
            </div>
          )}
          {success && !error && (
            <div className="rounded-lg bg-green-50 border border-green-100 p-3">
              <FieldDescription className="text-green-600 text-sm text-center">
                {email.includes("@") ? "Check your email for confirmation!" : "Login successful!"}
              </FieldDescription>
            </div>
          )}

          {/* Submit Button */}
          <Button 
            type="submit" 
            disabled={loading}
            className="h-11 w-full bg-gradient-to-r from-slate-700 to-slate-900 text-white font-medium hover:from-slate-800 hover:to-slate-950 shadow-lg shadow-slate-300/30 hover:shadow-xl hover:shadow-slate-400/40 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Signing in...
              </span>
            ) : (
              "Sign in"
            )}
          </Button>

          {/* Sign Up Link */}
          <FieldDescription className="text-center text-slate-500">
            Don&apos;t have an account?{" "}
            <a 
              href="#" 
              onClick={handleSignUp} 
              className="font-semibold text-slate-700 transition-colors hover:text-slate-900 underline-offset-4 hover:underline"
            >
              Create account
            </a>
          </FieldDescription>
        </FieldGroup>
      </form>
    </div>
  )
}
