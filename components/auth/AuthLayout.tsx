import { ReactNode } from 'react'
import { Logo } from '@/components/common/Logo'

interface AuthLayoutProps {
  children: ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      <div className="flex flex-col items-center justify-center gap-3 min-h-1/4 py-14 md:py-8">
        <Logo
          direction="col"
          iconClassName="h-10 w-auto sm:h-12 md:h-14"
          wordmarkClassName="h-8 w-auto sm:h-9 md:h-10"
        />
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center py-3 px-6 lg:p-12">
        <div className="w-full max-w-sm">
          {children}
        </div>
      </div>
    </div>
  )
}
