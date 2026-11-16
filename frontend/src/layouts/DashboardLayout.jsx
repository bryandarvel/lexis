import AppHeader from '../components/layout/AppHeader.jsx'

export default function DashboardLayout({
  children,
}) {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-pagina text-texto">
      <AppHeader />

      <main className="relative z-10 pt-14">
        {children}
      </main>
    </div>
  )
}
