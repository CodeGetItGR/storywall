'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Wrench, Bell, User, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabItems = [
  { href: '/feed', icon: Home, label: 'Home', isCenter: false },
  { href: '/tools', icon: Wrench, label: 'Tools', isCenter: false },
  { href: '/new-post', icon: Plus, label: 'Post', isCenter: true },
  { href: '/notifications', icon: Bell, label: 'Alerts', isCenter: false },
  { href: '/profile', icon: User, label: 'Profile', isCenter: false },
]

export default function MobileTabBar() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border flex items-center justify-around z-40 lg:hidden px-2"
    >
      {tabItems.map(({ href, icon: Icon, label, isCenter }) => {
        const active =
          pathname === href ||
          (href !== '/feed' && href !== '/new-post' && pathname.startsWith(href))

        if (isCenter) {
          return (
            <Link key={href} href={href} aria-label="New post">
              <div className="w-12 h-12 rounded-full bg-gradient-brand flex items-center justify-center shadow-md">
                <Icon className="w-6 h-6 text-white" strokeWidth={2.5} />
              </div>
            </Link>
          )
        }

        return (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-0.5 px-3 py-1 min-w-[48px]"
            aria-label={label}
            aria-current={active ? 'page' : undefined}
          >
            <Icon
              className={cn(
                'w-5 h-5 transition-colors',
                active ? 'text-primary' : 'text-ink-faint',
              )}
              strokeWidth={active ? 2.5 : 1.8}
            />
            <span
              className={cn(
                'text-[10px] font-medium transition-colors',
                active ? 'text-primary' : 'text-ink-faint',
              )}
            >
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
