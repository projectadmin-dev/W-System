/**
 * Payroll API Integration Tests
 * 
 * End-to-end tests for payroll endpoints.
 * Requires: Supabase connection + test data
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import { createClient } from '@supabase/supabase-js'

// Skip in CI if no Supabase credentials
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('⚠️  Skipping payroll API tests - missing Supabase credentials')
  describe.skip('Payroll API Integration', () => {
    it('skipped', () => {})
  })
} else {
  describe('Payroll API Integration', () => {
    let supabase: any
    let testPeriodId: string
    let testEmployeeId: string
    let testSlipId: string

    beforeAll(async () => {
      supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)
      
      // Create test employee if not exists
      const { data: testUser } = await supabase.auth.admin.createUser({
        email: 'test.payroll@example.com',
        password: 'Test1234!',
        user_metadata: { full_name: 'Test Payroll Employee' }
      })
      
      testEmployeeId = testUser?.user?.id || ''
      
      // Ensure employee profile exists
      await supabase.from('user_profiles').upsert({
        id: testEmployeeId,
        full_name: 'Test Payroll Employee',
        join_date: '2025-06-01',
        entity_id: 'test-entity-uuid' // Replace with actual test entity
      })
    })

    afterAll(async () => {
      // Cleanup test data
      if (testPeriodId) {
        await supabase.from('payroll_periods').delete().eq('id', testPeriodId)
      }
      if (testEmployeeId) {
        await supabase.auth.admin.deleteUser(testEmployeeId)
      }
    })

    describe('POST /api/payroll-periods', () => {
      it('should create a new payroll period', async () => {
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/payroll-periods`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
          },
          body: JSON.stringify({
            entity_id: 'test-entity-uuid',
            month: 4,
            year: 2026,
            start_date: '2026-04-01',
            end_date: '2026-04-30'
          })
        })

        const result = await response.json()
        
        expect(result.success).toBe(true)
        expect(result.data).toHaveProperty('id')
        expect(result.data.month).toBe(4)
        expect(result.data.year).toBe(2026)
        expect(result.data.status).toBe('draft')
        
        testPeriodId = result.data.id
      })

      it('should reject duplicate period', async () => {
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/payroll-periods`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
          },
          body: JSON.stringify({
            entity_id: 'test-entity-uuid',
            month: 4,
            year: 2026,
            start_date: '2026-04-01',
            end_date: '2026-04-30'
          })
        })

        const result = await response.json()
        
        expect(result.success).toBe(false)
        expect(response.status).toBe(409)
      })
    })

    describe('GET /api/payroll-periods', () => {
      it('should list payroll periods', async () => {
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/payroll-periods?year=2026`)
        const result = await response.json()

        expect(result.success).toBe(true)
        expect(Array.isArray(result.data)).toBe(true)
      })

      it('should filter by entity_id', async () => {
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/payroll-periods?entity_id=test-entity-uuid`)
        const result = await response.json()

        expect(result.success).toBe(true)
        result.data.forEach((period: any) => {
          expect(period.entity_id).toBe('test-entity-uuid')
        })
      })
    })

    describe('POST /api/payroll-periods/[id]/generate', () => {
      it('should generate payroll slips for all employees', async () => {
        // Skip if no test data
        if (!testPeriodId) {
          console.warn('⚠️  Skipping generate test - no period created')
          return
        }

        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/payroll-periods/${testPeriodId}/generate`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
          }
        })

        const result = await response.json()
        
        expect(result.success).toBe(true)
        expect(result.data).toHaveProperty('generated')
        expect(result.data).toHaveProperty('slips')
        expect(Array.isArray(result.data.slips)).toBe(true)
        
        if (result.data.slips.length > 0) {
          testSlipId = result.data.slips[0].slip_id
          
          // Verify slip has THP
          expect(result.data.slips[0]).toHaveProperty('thp')
          expect(typeof result.data.slips[0].thp).toBe('number')
        }
      })
    })

    describe('GET /api/payroll-slips/[id]', () => {
      it('should get payroll slip details', async () => {
        if (!testSlipId) {
          console.warn('⚠️  Skipping slip details test - no slip created')
          return
        }

        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/payroll-slips/${testSlipId}`, {
          headers: {
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
          }
        })

        const result = await response.json()
        
        expect(result.success).toBe(true)
        expect(result.data).toHaveProperty('thp')
        expect(result.data).toHaveProperty('payroll_slip_details')
        expect(Array.isArray(result.data.payroll_slip_details)).toBe(true)
        
        // Verify calculation breakdown
        const earnings = result.data.payroll_slip_details
          .filter((d: any) => d.type === 'earning')
          .reduce((sum: number, d: any) => sum + d.amount, 0)
        
        const deductions = result.data.payroll_slip_details
          .filter((d: any) => d.type === 'deduction')
          .reduce((sum: number, d: any) => sum + d.amount, 0)
        
        expect(Math.abs(earnings - result.data.total_earnings)).toBeLessThan(0.01)
        expect(Math.abs(deductions - result.data.total_deductions)).toBeLessThan(0.01)
        expect(Math.abs((earnings - deductions) - result.data.thp)).toBeLessThan(0.01)
      })
    })

    describe('PUT /api/payroll-slips/[id]', () => {
      it('should approve payroll slip', async () => {
        if (!testSlipId) {
          console.warn('⚠️  Skipping approve test - no slip created')
          return
        }

        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/payroll-slips/${testSlipId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
          },
          body: JSON.stringify({ status: 'approved' })
        })

        const result = await response.json()
        
        expect(result.success).toBe(true)
        expect(result.data.status).toBe('approved')
        expect(result.data).toHaveProperty('approved_at')
      })
    })
  })
}
