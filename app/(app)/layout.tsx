import {DesktopNavRail, RightContextPanel, MobileTabBar} from '@/components/layout'
import {ReactNode} from "react";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <DesktopNavRail />
      {/* lg:pl matches the 220px nav rail; xl:pr matches the 300px right panel */}
      <main className="w-full min-h-screen pb-20 lg:pb-0 lg:pl-55 xl:pr-75">
        <div className="lg:max-w-none">
          {children}
        </div>
      </main>
      <RightContextPanel />
      <MobileTabBar />
    </div>
  )
}
