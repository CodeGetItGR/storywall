import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

// What every theme comes with and how it works, as two panels; the first starts open. Plain
// <details>, so both are in the page's HTML and open without scripts.
export function ThemeDetails() {
    const t = useTranslations('SaveMyDateStorefront.theme');
    const items = t.raw('includedItems') as string[];

    return (
        <div className="divide-y divide-[#151313]/10 border-y border-[#151313]/10">
            {/* What's included */}
            <DetailsPanel open title={t('included')}>
                <ul className="m-0 flex list-disc flex-col gap-1.5 pl-5">
                    {items.map((item) => (
                        <li key={item}>{item}</li>
                    ))}
                </ul>
            </DetailsPanel>

            {/* How it works */}
            <DetailsPanel title={t('howItWorks')}>
                <p className="m-0">{t('howItWorksBody')}</p>
            </DetailsPanel>
        </div>
    );
}

type DetailsPanelProps = { title: string; open?: boolean; children: ReactNode };

function DetailsPanel({ title, open = false, children }: DetailsPanelProps) {
    return (
        <details className="group" open={open}>
            <summary className="flex min-h-13 cursor-pointer list-none items-center justify-between gap-4 py-3 text-[16px] font-semibold text-[#151313] focus-ring [&::-webkit-details-marker]:hidden">
                {title}
                <ChevronDown aria-hidden className="size-4.5 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
            </summary>
            <div className="pb-4 text-[15px] leading-relaxed text-[#151313]/75">{children}</div>
        </details>
    );
}
