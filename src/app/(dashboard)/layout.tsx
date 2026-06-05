import { Sidebar } from '@/components/layout/Sidebar'
import { MobileNav } from '@/components/layout/MobileNav'
import { TopBar } from '@/components/layout/TopBar'
import { NewTransactionFAB } from '@/components/layout/NewTransactionFAB'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen" style={{ background: '#0f0f0f' }}>
      {/* Sidebar — solo desktop */}
      <Sidebar />

      {/* Contenido principal */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
          {children}
        </main>
      </div>

      {/* FAB nueva transacción — solo mobile */}
      <NewTransactionFAB />

      {/* Bottom nav — solo mobile */}
      <MobileNav />
    </div>
  )
}
