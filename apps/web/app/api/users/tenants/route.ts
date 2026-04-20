import { NextResponse } from 'next/server'
import { userRepository } from '@/lib/repositories/user-repository'

/**
 * GET /api/users/tenants - Get all active tenants
 * Admin only endpoint
 */
export async function GET() {
  try {
    const tenants = await userRepository.getTenants()
    
    return NextResponse.json({
      data: tenants,
    })
  } catch (error) {
    console.error('Error fetching tenants:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tenants', message: (error as Error).message },
      { status: 500 }
    )
  }
}
