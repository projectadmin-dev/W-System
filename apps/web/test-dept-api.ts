import { createServerClient } from '../lib/supabase-server'
import { cookies } from 'next/headers'

export async function GET() {
    const cookieStore = await cookies()
    // Create a minimal session cookie
    cookieStore.set('sb-sts', 'authenticated')
    
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll() { /* noop */ }
            }
        }
    )
    
    const { data } = await supabase
        .from('hr_departments')
        .select('*')
        .order('name', { ascending: true })
    
    return { departments: data || [] }
}

// Export test function
export async function testCreate() {
    const cookieStore = await cookies()
    cookieStore.set('sb-sts', 'authenticated')
    
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll() { /* noop */ }
            }
        }
    )
    
    const { data } = await supabase
        .from('hr_departments')
        .insert({
            tenant_id: '10000000-0000-0000-0000-000000000001',
            entity_id: '20000000-0000-0000-0000-000000000001',
            name: 'Test Department',
            code: 'TEST-DEPT',
            description: 'Testing department creation',
            is_active: true
        })
        .select()
        .single()
    
    return { department: data }
}
