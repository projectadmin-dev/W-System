// Helper untuk sort indicator - perlu di-export dari component
import { getMockEntities } from "@/lib/entities-data"

const uniqueCities = Array.from(new Set(getMockEntities().map((e) => e.city)))

export { uniqueCities }
