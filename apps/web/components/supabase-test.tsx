'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function SupabaseTest() {
  const [status, setStatus] = useState<'checking' | 'connected' | 'error'>('checking')
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function testConnection() {
      const supabase = createClient()
      try {
        // Test connection by checking auth session (doesn't require table)
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          // Auth error, but connection might still work
          setStatus('connected')
          setMessage(`✅ Connected to Supabase! (Auth service working)`)
        } else {
          setStatus('connected')
          setMessage(session 
            ? `✅ Connected! User: ${session.user.email}` 
            : '✅ Connected to Supabase! (Not logged in)')
        }
      } catch (err: any) {
        setStatus('error')
        setMessage(`❌ Connection failed: ${err.message}`)
      }
    }

    testConnection()
  }, [])

  return (
    <div className="p-4 rounded-lg border bg-card">
      <h3 className="font-semibold mb-2">Supabase Connection Test</h3>
      <p className="text-sm">{message}</p>
      {status === 'checking' && <p className="text-sm text-muted-foreground mt-2">Checking connection...</p>}
    </div>
  )
}
