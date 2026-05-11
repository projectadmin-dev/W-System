/**
 * Mock Data Structure untuk Entity Management
 * Tipe: HO (Head Office) / BO (Branch Office)
 */

export type EntityStatus = 'Active' | 'Inactive'
export type EntityType = 'HO' | 'BO'

export interface Entity {
  code: string
  name: string
  type: EntityType
  city: string
  status: EntityStatus
  legalEntity: string | null // Required if HO
  npwp: string | null // Required if HO, must be 15 digits
  parentCode: string | null // Required if BO
  address: string
  phone: string
  email: string
  website: string | null
  bpjsSettings: {
    healthInsurance: {
      employee: string // e.g., "1%"
      company: string  // e.g., "4%"
    }
    pension: {
      employee: string
      company: string
    }
  }
}

// Mock Data - Sumber dari wireframe + business rules
export const mockEntities: Entity[] = [
  {
    code: 'WLBS',
    name: 'WELABS',
    type: 'HO',
    city: 'Bandung',
    status: 'Active',
    legalEntity: 'PT. Wira Inovasi Teknologi',
    npwp: '01.234.567.8-901.000',
    parentCode: null,
    address: 'Jl. Merdeka No. 123, Bandung, Jawa Barat',
    phone: '+62 22 1234 5678',
    email: 'info@welabs.id',
    website: 'https://www.welabs.id',
    bpjsSettings: {
      healthInsurance: { employee: '1%', company: '4%' },
      pension: { employee: '2%', company: '3.70%' }
    }
  },
  {
    code: 'WIT-WORKSHOP',
    name: 'WIT WORKSHOP (Kantorpusat)',
    type: 'BO',
    city: 'Bandung',
    status: 'Active',
    legalEntity: null,
    npwp: '01.234.567.8-901.001',
    parentCode: 'WLBS',
    address: 'Jl. Merdeka No. 123, Bandung, Jawa Barat',
    phone: '+62 22 1234 5679',
    email: 'workshop@wit.id',
    website: 'https://www.wit.id',
    bpjsSettings: {
      healthInsurance: { employee: '1%', company: '4%' },
      pension: { employee: '2%', company: '3.70%' }
    }
  },
  {
    code: 'WIT.SBY',
    name: 'Surabaya',
    type: 'BO',
    city: 'Surabaya',
    status: 'Active',
    legalEntity: null,
    npwp: '01.234.567.8-901.002',
    parentCode: 'WLBS',
    address: 'Jl. Ahmad Yani No. 45, Surabaya, Jawa Timur',
    phone: '+62 31 1234 5680',
    email: 'surabaya@wit.id',
    website: 'https://www.wit.id',
    bpjsSettings: {
      healthInsurance: { employee: '1%', company: '4%' },
      pension: { employee: '2%', company: '3.70%' }
    }
  },
  {
    code: 'WITJKT',
    name: 'WIT jakarta',
    type: 'BO',
    city: 'Jakarta',
    status: 'Active',
    legalEntity: null,
    npwp: '01.234.567.8-901.003',
    parentCode: 'WLBS',
    address: 'Jl. Sudirman No. 78, Jakarta Pusat, DKI Jakarta',
    phone: '+62 21 1234 5681',
    email: 'jakarta@wit.id',
    website: 'https://www.wit.id',
    bpjsSettings: {
      healthInsurance: { employee: '1%', company: '4%' },
      pension: { employee: '2%', company: '3.70%' }
    }
  }
]

// Helper functions
export const getTipeLabel = (type: EntityType): string => {
  return type === 'HO' ? 'Kantor Pusat' : 'Kantor Cabang'
}

export const getMockEntities = (): Entity[] => {
  return [...mockEntities]
}
