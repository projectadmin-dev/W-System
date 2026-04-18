"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "../lib/supabase"
import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"

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
      // Redirect to dashboard after successful login
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
      // OAuth redirect happens automatically
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
      setError("Check your email for the confirmation link!")
    } catch (err: any) {
      setError(err.message || "Sign up failed.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={cn("flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 p-4", className)} {...props}>
      <Card className="w-full max-w-md border-slate-200 bg-white shadow-2xl shadow-slate-200/50">
        <CardHeader className="text-center space-y-2 pb-6">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 shadow-lg shadow-slate-300/50">
            {/* Ganti dengan logo Anda - ukuran rekomendasi: 48x48px atau 64x64px */}
            {/* Format: SVG atau PNG dengan background transparent */}
            <img 
              src="/logo.svg" 
              alt="WIT. System Logo" 
              className="h-8 w-8 object-contain"
            />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-800">WIT. System</CardTitle>
          <CardDescription className="text-slate-500">
            Sign in to your account to continue
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <form onSubmit={handleEmailLogin}>
            <FieldGroup className="space-y-4">
              {/* OAuth Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  variant="outline" 
                  type="button"
                  onClick={() => handleOAuthLogin("apple")}
                  disabled={loading}
                  className="h-11 border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="mr-2 h-4 w-4">
                    <path
                      d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"
                      fill="currentColor"
                    />
                  </svg>
                  Apple
                </Button>
                <Button 
                  variant="outline" 
                  type="button"
                  onClick={() => handleOAuthLogin("google")}
                  disabled={loading}
                  className="h-11 border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="mr-2 h-4 w-4">
                    <path
                      d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                      fill="currentColor"
                    />
                  </svg>
                  Google
                </Button>
              </div>

              <FieldSeparator className="*:data-[slot=field-separator-content]:bg-slate-100 text-slate-400">
                Or continue with email
              </FieldSeparator>

              {/* Email Field */}
              <Field className="space-y-1.5">
                <FieldLabel htmlFor="email" className="text-sm font-medium text-slate-700">
                  Email address
                </FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="h-11 border-slate-200 bg-white/50 placeholder:text-slate-400 focus:border-slate-400 focus:ring-slate-400/20 transition-all duration-200"
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                  disabled={loading}
                  className="h-11 border-slate-200 bg-white/50 placeholder:text-slate-400 focus:border-slate-400 focus:ring-slate-400/20 transition-all duration-200"
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

          {/* Terms */}
          <FieldDescription className="text-center text-xs text-slate-400 pt-4 border-t border-slate-100">
            By clicking continue, you agree to our{" "}
            <a href="#" className="font-medium text-slate-500 transition-colors hover:text-slate-700 underline-offset-4 hover:underline">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="#" className="font-medium text-slate-500 transition-colors hover:text-slate-700 underline-offset-4 hover:underline">
              Privacy Policy
            </a>.
          </FieldDescription>
        </CardContent>
      </Card>
    </div>
  )
}
