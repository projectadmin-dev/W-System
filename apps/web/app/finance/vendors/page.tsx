'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Vendor {
  id: string
  vendor_code: string
  vendor_name: string
  vendor_type: string
  email: string
  phone: string
  payment_terms_days: number
  is_active: boolean
  coa?: {
    account_code: string
    account_name: string
  }
}

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')

  useEffect(() => {
    fetchVendors()
  }, [])

  async function fetchVendors() {
    try {
      const res = await fetch('/api/finance/vendors')
      const data = await res.json()
      if (data.data) {
        setVendors(data.data)
      }
    } catch (error) {
      console.error('Error fetching vendors:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredVendors = vendors.filter(vendor => {
    if (filter === 'active') return vendor.is_active
    if (filter === 'inactive') return !vendor.is_active
    return true
  })

  return (
    <div className="flex flex-col gap-6 py-6 px-4 lg:px-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Vendor Management</h1>
            <p className="text-muted-foreground">Manage suppliers and vendor master data</p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/finance/transactions"
              className="text-primary hover:text-primary/80"
            >
              ← Back to Transactions
            </Link>
            <button className="bg-blue-600 hover:bg-blue-700 text-foreground px-4 py-2 rounded-lg transition-colors">
              + New Vendor
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-8">
        {/* Filters */}
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filter === 'all'
                    ? 'bg-blue-600 text-foreground'
                    : 'bg-muted text-foreground hover:bg-muted/80'
                }`}
              >
                All Vendors
              </button>
              <button
                onClick={() => setFilter('active')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filter === 'active'
                    ? 'bg-green-600 text-foreground'
                    : 'bg-muted text-foreground hover:bg-muted/80'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setFilter('inactive')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filter === 'inactive'
                    ? 'bg-red-600 text-foreground'
                    : 'bg-muted text-foreground hover:bg-muted/80'
                }`}
              >
                Inactive
              </button>
            </div>
            <div className="text-muted-foreground text-sm">
              Showing {filteredVendors.length} of {vendors.length} vendors
            </div>
          </div>
        </div>

        {/* Vendors Table */}
        <div>
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading vendors...</div>
          ) : filteredVendors.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No vendors found</div>
          ) : (
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Payment Terms
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    COA Account
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredVendors.map((vendor) => (
                  <tr key={vendor.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground font-mono">
                      {vendor.vendor_code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      {vendor.vendor_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground capitalize">
                      {vendor.vendor_type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      <div>{vendor.email}</div>
                      <div className="text-xs text-muted-foreground">{vendor.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      {vendor.payment_terms_days} days
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      {vendor.coa ? (
                        <div>
                          <div className="font-mono">{vendor.coa.account_code}</div>
                          <div className="text-xs text-muted-foreground">{vendor.coa.account_name}</div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Not assigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          vendor.is_active
                            ? 'bg-green-600 text-foreground'
                            : 'bg-muted text-foreground'
                        }`}
                      >
                        {vendor.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      <button className="text-primary hover:text-blue-300 mr-3">Edit</button>
                      <button className="text-destructive hover:text-red-300">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
