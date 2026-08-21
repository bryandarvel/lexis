import AppHeader from '../components/layout/AppHeader.jsx'

export default function DashboardLayout({
  children,
}) {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-lexis-950 text-lexis-50">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_right,rgba(57,176,255,0.14),transparent_32%)]"
      />

      <AppHeader />

      <main className="relative z-10 pt-20">
        {children}
      </main>
    </div>
  )
}
