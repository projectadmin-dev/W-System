'use client'

import Link from 'next/link'
import { useState } from 'react'

/**
 * Finance Core Transactions Dashboard
 * PSAK 13 & 23 - Accounts Payable, Receivable, Payments, Receipts
 */

interface ModuleCardProps {
  title: string
  description: string
  href: string
  icon: string
  count?: number
}

function ModuleCard({ title, description, href, icon, count }: ModuleCardProps) {
  return (
    <Link href={href}>
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 hover:border-blue-500 transition-all cursor-pointer group">
        <div className="flex items-center justify-between mb-4">
          <div className="text-4xl">{icon}</div>
          {count !== undefined && (
            <span className="bg-blue-600 text-white text-sm font-semibold px-3 py-1 rounded-full">
              {count}
            </span>
          )}
        </div>
        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
          {title}
        </h3>
        <p className="text-gray-400 text-sm">{description}</p>
      </div>
    </Link>
  )
}

export default function TransactionsPage() {
  const [stats, setStats] = useState({
    vendors: 0,
    customers: 0,
    pendingBills: 0,
    pendingInvoices: 0,
    paymentsThisMonth: 0,
    receiptsThisMonth: 0,
  })

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Core Transactions</h1>
            <p className="text-gray-400">
              PSAK 13 & 23 - Accounts Payable, Receivable, Payments, Receipts
            </p>
          </div>
          <Link
            href="/finance"
            className="text-blue-400 hover:text-blue-300 transition-colors"
          >
            ← Back to Finance
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-8">
        {/* Module Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <ModuleCard
            title="Vendors"
            description="Manage suppliers and vendor master data"
            href="/finance/vendors"
            icon="🏢"
            count={stats.vendors}
          />
          <ModuleCard
            title="Customers"
            description="Manage customers and client master data"
            href="/finance/customers"
            icon="👥"
            count={stats.customers}
          />
          <ModuleCard
            title="Vendor Bills"
            description="Accounts Payable - Bills from vendors"
            href="/finance/vendor-bills"
            icon="📄"
            count={stats.pendingBills}
          />
          <ModuleCard
            title="Customer Invoices"
            description="Accounts Receivable - Invoices to customers"
            href="/finance/customer-invoices"
            icon="📋"
            count={stats.pendingInvoices}
          />
          <ModuleCard
            title="Payments"
            description="Cash outflows to vendors"
            href="/finance/payments"
            icon="💸"
            count={stats.paymentsThisMonth}
          />
          <ModuleCard
            title="Receipts"
            description="Cash inflows from customers"
            href="/finance/receipts"
            icon="💰"
            count={stats.receiptsThisMonth}
          />
        </div>

        {/* Quick Actions */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/finance/vendors?action=new"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              + New Vendor
            </Link>
            <Link
              href="/finance/customers?action=new"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              + New Customer
            </Link>
            <Link
              href="/finance/vendor-bills?action=new"
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              + New Vendor Bill
            </Link>
            <Link
              href="/finance/customer-invoices?action=new"
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              + New Customer Invoice
            </Link>
            <Link
              href="/finance/payments?action=new"
              className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              + New Payment
            </Link>
            <Link
              href="/finance/receipts?action=new"
              className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              + New Receipt
            </Link>
          </div>
        </div>

        {/* PSAK Compliance Info */}
        <div className="mt-8 bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">PSAK Compliance</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-400">
            <div>
              <h3 className="font-semibold text-white mb-2">PSAK 13 - Work in Progress</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>Vendor transactions tracked by project</li>
                <li>Cost allocation to WIP accounts</li>
                <li>Period-end accruals</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">PSAK 23 - Revenue Recognition</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>Revenue recognized upon delivery</li>
                <li>Customer invoices linked to contracts</li>
                <li>Accounts receivable aging</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
