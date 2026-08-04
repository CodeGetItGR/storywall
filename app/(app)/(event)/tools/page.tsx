import { BookHeart, Calendar, ChevronRight, Gift, HelpCircle, LayoutGrid, Mail, MapPin, Music, Users } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { routes } from '@/lib/routes';

const tools = [
    {
        href: routes.tools.rsvpSubmit,
        icon: Users,
        key: 'rsvp',
        color: 'bg-emerald-50 text-emerald-600',
        badgeCount: 6,
    },
    {
        href: routes.tools.gifts,
        icon: Gift,
        key: 'gifts',
        color: 'bg-rose-50 text-rose-500',
        badgeCount: 3,
    },
    {
        href: routes.tools.wishbook,
        icon: BookHeart,
        key: 'wishbook',
        color: 'bg-pink-50 text-pink-500',
        badgeCount: 4,
    },
    {
        href: routes.tools.schedule,
        icon: Calendar,
        key: 'schedule',
        color: 'bg-amber-50 text-amber-500',
        badgeCount: 9,
    },
    {
        href: routes.tools.venue,
        icon: MapPin,
        key: 'venue',
        color: 'bg-sky-50 text-sky-500',
        badgeCount: null,
    },
    {
        href: routes.tools.playlist,
        icon: Music,
        key: 'playlist',
        color: 'bg-violet-50 text-violet-500',
        badgeCount: 10,
    },
    {
        href: routes.tools.quiz,
        icon: HelpCircle,
        key: 'quiz',
        color: 'bg-orange-50 text-orange-500',
        badgeCount: 5,
    },
    {
        href: routes.tools.seating,
        icon: LayoutGrid,
        key: 'seating',
        color: 'bg-indigo-50 text-indigo-500',
        badgeCount: 5,
    },
    {
        href: routes.tools.futureMessages,
        icon: Mail,
        key: 'futureMessages',
        color: 'bg-teal-50 text-teal-500',
        badgeCount: null,
    },
] as const;

export default function ToolsPage() {
    const t = useTranslations('ToolsPage');

    return (
        <div className="max-w-2xl mx-auto px-4 pb-24 lg:pb-8">
            <div className="pt-5 pb-6">
                <h1 className="text-2xl font-bold text-ink">{t('title')}</h1>
                <p className="text-sm text-ink-muted mt-1">{t('subtitle')}</p>
            </div>

            <div className="flex flex-col gap-2">
                {tools.map((tool) => {
                    const Icon = tool.icon;
                    return (
                        <Link
                            key={tool.href}
                            href={tool.href}
                            className="flex items-center gap-4 bg-card rounded-2xl px-4 py-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all border border-border/50 group"
                        >
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${tool.color}`}>
                                <Icon className="w-5 h-5" strokeWidth={1.8} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-semibold text-ink group-hover:text-primary transition-colors">
                                        {t(`items.${tool.key}.label`)}
                                    </p>
                                    {tool.badgeCount !== null && (
                                        <span className="px-2 py-0.5 rounded-full bg-surface-muted text-ink-muted text-[11px] font-medium">
                                            {t(`items.${tool.key}.badge`, {
                                                count: tool.badgeCount,
                                            })}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-ink-muted mt-0.5 leading-snug">{t(`items.${tool.key}.description`)}</p>
                            </div>
                            <ChevronRight
                                className="w-4 h-4 text-ink-faint group-hover:text-ink-muted transition-colors shrink-0"
                                aria-hidden="true"
                            />
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
