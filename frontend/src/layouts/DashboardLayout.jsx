import AppHeader from '../components/layout/AppHeader.jsx'

export default function DashboardLayout({
  children,
}) {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-lexis-950 text-lexis-50">
      <AppHeader />

      <main className="relative z-10 pt-14">
        {children}
      </main>
    </div>
  )
}
