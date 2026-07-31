'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Home, Wrench, Bell, User, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabItems = [
  { href: '/feed', icon: Home, key: 'home', isCenter: false },
  { href: '/notifications', icon: Bell, key: 'alerts', isCenter: false },
  { href: '/profile', icon: User, key: 'profile', isCenter: false },
]

export function MobileTabBar() {
  const t = useTranslations('MobileTabBar')
  const pathname = usePathname()

  return (
    <nav
      aria-label={t('mobileNavigation')}
      className="fixed bottom-0 left-1/2 -translate-x-1/2 h-16 bg-white/90 border-t border-border rounded-t-2xl flex items-center justify-around z-40 lg:hidden px-5 w-9/10"
    >
      {tabItems.map(({ href, icon: Icon, key, isCenter }) => {
        const active =
          pathname === href ||
          (href !== '/feed' && href !== '/new-post' && pathname.startsWith(href))

        if (isCenter) {
          return (
            <Link key={href} href={href} aria-label={t('newPost')}>
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
            className="flex flex-col items-center gap-0.5 px-3 py-1 min-w-12"
            aria-label={t(`items.${key}`)}
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
              {t(`items.${key}`)}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
