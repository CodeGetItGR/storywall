import DesktopNavRail from '@/components/layout/desktop-nav-rail'
import MobileTabBar from '@/components/layout/mobile-tab-bar'
import RightContextPanel from '@/components/layout/right-context-panel'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <DesktopNavRail />
      {/* lg:pl matches the 220px nav rail; xl:pr matches the 300px right panel */}
      <main className="lg:pl-[220px] xl:pr-[300px] min-h-screen pb-20 lg:pb-0">
        <div className="max-w-2xl lg:max-w-none">
          {children}
        </div>
      </main>
      <RightContextPanel />
      <MobileTabBar />
    </div>
  )
}
