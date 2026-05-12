import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Payment Reconciliation — W.System Finance",
  description: "Cocokkan payment dengan bill / receipt dengan invoice",
}

export default function PaymentReconciliationLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
