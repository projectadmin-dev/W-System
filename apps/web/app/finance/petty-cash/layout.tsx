import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Petty Cash — W.System Finance",
  description: "Manajemen Kas Kecil: top-up, pengeluaran, settlement, running saldo",
}

export default function PettyCashLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
