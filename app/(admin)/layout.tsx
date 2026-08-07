'use client';

import { ClipboardList, LayoutGrid, LogOut, Settings2, Shield } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { type ReactNode, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';

const quickLinks = [
    { href: `${routes.admin}#account-plans`, key: 'accountPlans', icon: LayoutGrid },
    { href: `${routes.admin}#event-plans`, key: 'eventPlans', icon: ClipboardList },
    { href: `${routes.admin}#modules`, key: 'modules', icon: Settings2 },
    { href: `${routes.admin}#assignments`, key: 'assignments', icon: Shield },
] as const;

export default function AdminLayout({ children }: { children: ReactNode }) {
    const t = useTranslations('AdminPage');
    const pathname = usePathname();
    const router = useRouter();
    const { user, isBootstrapping, logout } = useAuth();
    const [hash, setHash] = useState('');

    useEffect(() => {
        function syncHash() {
            setHash(window.location.hash);
        }

        syncHash();
        window.addEventListener('hashchange', syncHash);
        return () => window.removeEventListener('hashchange', syncHash);
    }, []);

    const activeLink = useMemo(
        () => quickLinks.find((link) => pathname === routes.admin && link.href.endsWith(hash || '#account-plans'))?.href,
        [hash, pathname]
    );

    if (isBootstrapping) {
        return <div className="min-h-screen bg-[#f7f3ed]" />;
    }

    if (user?.role !== 'ADMIN') {
        return <>{children}</>;
    }

    async function handleLogout() {
        await logout();
        router.push(routes.login);
    }

    return (
        <div className="min-h-screen bg-[#f7f3ed] text-ink">
            <div className="mx-auto flex min-h-screen max-w-[1720px]">
                <aside className="hidden w-72 shrink-0 border-r border-black/5 bg-[#f3eee6] px-5 py-6 lg:flex lg:flex-col">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink text-white shadow-sm">
                            <Shield className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-muted">{t('eyebrow')}</p>
                            <p className="text-lg font-semibold">{t('layout.console')}</p>
                        </div>
                    </div>

                    <div className="mt-8 rounded-2xl border border-black/5 bg-white p-4 shadow-[0_10px_28px_rgba(36,31,26,0.05)]">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-faint">{t('layout.signedInAs')}</p>
                        <p className="mt-2 text-sm font-semibold text-ink">{user?.email ?? 'Admin'}</p>
                        <p className="mt-1 text-xs text-ink-muted">{user?.userId}</p>
                    </div>

                    <nav className="mt-6 space-y-1.5">
                        {quickLinks.map(({ href, key, icon: Icon }) => {
                            const active = activeLink === href;
                            return (
                                <Link
                                    key={href}
                                    href={href}
                                    className={cn(
                                        'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors',
                                        active ? 'bg-ink text-white' : 'bg-white text-ink-muted hover:bg-surface-muted hover:text-ink'
                                    )}
                                >
                                    <Icon className="h-4 w-4" />
                                    {t(`layout.${key}`)}
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="mt-auto pt-6">
                        <button
                            type="button"
                            onClick={handleLogout}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-black/5 bg-white px-4 py-3 text-sm font-semibold text-ink-muted transition hover:bg-surface-muted hover:text-ink"
                        >
                            <LogOut className="h-4 w-4" />
                            {t('layout.signOut')}
                        </button>
                    </div>
                </aside>

                <div className="flex min-w-0 flex-1 flex-col">
                    <header className="sticky top-0 z-20 border-b border-black/5 bg-[#f7f3ed]/90 px-4 py-3 backdrop-blur lg:hidden">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-muted">{t('eyebrow')}</p>
                                <p className="text-base font-semibold text-ink">{t('layout.console')}</p>
                            </div>
                            <button
                                type="button"
                                onClick={handleLogout}
                                className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-semibold text-ink-muted shadow-sm"
                            >
                                <LogOut className="h-4 w-4" />
                                {t('layout.signOut')}
                            </button>
                        </div>
                    </header>

                    <main className="min-w-0 flex-1">{children}</main>
                </div>
            </div>
        </div>
    );
}
