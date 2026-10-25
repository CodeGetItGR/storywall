import { ArrowLeft, Calendar, Camera, CreditCard, Layers, LogOut, Pencil } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { MockPhoto } from '@/components/occasions/wedding/mock/MockPhoto';
import type { Locale } from '@/i18n/config';
import type { OccasionPhoto } from '@/lib/occasions/occasionMedia';
import type { WeddingDemoProfileCopy } from '@/lib/occasions/weddingCopy';
import { cn } from '@/lib/utils';

// Events, plans, features.
const MENU_ICONS = [Calendar, CreditCard, Layers] as const;
// The language switch shows both codes; the page's own is underlined.
const LANGUAGES: readonly Locale[] = ['en', 'el'];

const PILL = 'flex h-[13cqw] w-[54cqw] items-center gap-[3cqw] rounded-full bg-white/15 px-[5cqw] text-[3.8cqw] leading-none font-medium';

type DemoProfileScreenProps = { copy: WeddingDemoProfileCopy; locale: Locale; photo: OccasionPhoto };

// The guest's menu on the brand gradient, with the Profile panel sliding in over its right side.
export function DemoProfileScreen({ copy, locale, photo }: DemoProfileScreenProps) {
    const t = useTranslations('ImageAlt');

    return (
        <div className="absolute inset-0 bg-[linear-gradient(165deg,#ef5f8a_0%,#f47a76_42%,#f6995d_100%)] text-white">
            {/* Account */}
            <div className="flex w-[64%] items-center gap-[4cqw] pt-[30cqw] pr-[3cqw] pl-[8cqw]">
                <span className="relative shrink-0">
                    <MockPhoto
                        alt={t('profilePhotoOf', { name: copy.name })}
                        className="block size-[18cqw] rounded-full border-[0.8cqw] border-white"
                        photo={photo}
                        sizes="80px"
                    />
                    <span className="absolute -right-[0.6cqw] bottom-0 grid size-[6cqw] place-items-center rounded-full border-[0.6cqw] border-white bg-[#ff765f]">
                        <Pencil className="size-[2.8cqw]" strokeWidth={2.4} />
                    </span>
                </span>
                <span className="min-w-0">
                    <span className="block truncate text-[4.6cqw] font-bold">{copy.name}</span>
                    <span className="mt-[0.8cqw] block truncate text-[3.4cqw] text-white/80">{copy.email}</span>
                </span>
            </div>
            {/* Language */}
            <div className="mx-[8cqw] mt-[7cqw] flex w-[60%] justify-center gap-[4cqw] border-b border-white/40 pb-[4cqw] text-[3.8cqw] font-semibold">
                {LANGUAGES.map((language) => (
                    <span
                        className={language === locale ? 'underline decoration-[0.5cqw] underline-offset-[1.6cqw]' : 'text-white/70'}
                        key={language}
                    >
                        {language.toUpperCase()}
                    </span>
                ))}
            </div>
            {/* Menu */}
            <ul className="m-0 mt-[6cqw] flex list-none flex-col items-start gap-[3.6cqw] px-[6cqw] py-0">
                {copy.menu.map((item, index) => {
                    const Icon = MENU_ICONS[index]!;
                    return (
                        <li className={PILL} key={item}>
                            <Icon className="size-[4.6cqw]" strokeWidth={1.8} />
                            {item}
                        </li>
                    );
                })}
            </ul>
            {/* Sign out */}
            <span className={cn(PILL, 'absolute bottom-[18cqw] left-[6cqw]')}>
                <LogOut className="size-[4.6cqw]" strokeWidth={1.8} />
                {copy.signOut}
            </span>
            {/* Profile panel, cut by the screen's edge */}
            <div className="absolute top-[22cqw] -right-[10%] bottom-[30%] left-[64%] rounded-[5cqw] bg-white px-[5cqw] pt-[9cqw] text-[#151313] shadow-[-2cqw_0_6cqw_rgba(70,38,24,0.18)]">
                <span className="flex items-center gap-[1cqw] text-[3cqw] text-[#ff765f]">
                    <ArrowLeft className="size-[3cqw]" strokeWidth={2} />
                    {copy.back}
                </span>
                <p className="m-0 mt-[6cqw] text-[5cqw] font-bold">{copy.title}</p>
                <div className="mt-[4cqw] rounded-[4cqw] border border-[#151313]/8 p-[4cqw]">
                    <span className="relative block w-fit">
                        <MockPhoto alt={t('profilePhotoOf', { name: copy.panelName })} className="block size-[17cqw] rounded-full" photo={photo} sizes="64px" />
                        <span className="absolute right-0 bottom-0 grid size-[5.4cqw] place-items-center rounded-full bg-[#ff765f] text-white">
                            <Camera className="size-[3cqw]" strokeWidth={2} />
                        </span>
                    </span>
                    <p className="m-0 mt-[4cqw] truncate text-[3.8cqw] font-bold">{copy.panelName}</p>
                    <p className="m-0 mt-[1cqw] truncate text-[3cqw] text-[#151313]/50">{copy.email}</p>
                    <p className="m-0 mt-[5cqw] text-[2.8cqw] tracking-[0.08em] text-[#151313]/50">{copy.nameLabel}</p>
                </div>
            </div>
        </div>
    );
}
