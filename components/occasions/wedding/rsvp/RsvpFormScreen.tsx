import { ArrowLeft, CircleCheck, CircleX, Minus, Plus, Users } from 'lucide-react';

import { MockStatusBar } from '@/components/occasions/wedding/mock/MockStatusBar';
import { MockTabBar } from '@/components/occasions/wedding/mock/MockTabBar';
import type { WeddingRsvpFormCopy } from '@/lib/occasions/weddingCopy';
import { cn } from '@/lib/utils';

const LABEL = 'm-0 text-[2.9cqw] font-bold tracking-[0.06em] text-[#151313]/70';
const ANSWER = 'flex h-[13.3cqw] items-center justify-center gap-[1.8cqw] rounded-full border-[0.6cqw] text-[3.8cqw] font-semibold';
const ROUND = 'grid size-[7.4cqw] place-items-center rounded-full bg-white';

function Stepper({ label }: { label: string }) {
    return (
        <div className="flex h-[13.9cqw] items-center justify-between rounded-full bg-[#f8ece1] px-[3.2cqw]">
            <span className={ROUND}>
                <Minus className="size-[3.6cqw]" strokeWidth={2.4} />
            </span>
            <span className="text-[3.8cqw] font-bold">{label}</span>
            <span className={ROUND}>
                <Plus className="size-[3.6cqw]" strokeWidth={2.4} />
            </span>
        </div>
    );
}

// The guest's RSVP form with "Yes" picked.
export function RsvpFormScreen({ form, module }: { form: WeddingRsvpFormCopy; module: string }) {
    return (
        <>
            <MockStatusBar />
            {/* App bar */}
            <div className="relative flex items-center justify-center px-[5.5cqw] pt-[6.5cqw] pb-[2cqw]">
                <ArrowLeft className="absolute left-[5.5cqw] size-[5cqw]" strokeWidth={2} />
                <span className="flex items-center gap-[1.8cqw] text-[5cqw] leading-none font-bold">
                    <Users className="size-[5cqw] text-[#2fae8e]" strokeWidth={2} />
                    {module}
                </span>
            </div>
            <div className="px-[5.5cqw] pt-[9.5cqw]">
                <p className="m-0 text-[4.2cqw] font-bold">{form.title}</p>
                {/* Attending */}
                <p className={cn(LABEL, 'mt-[5.5cqw]')}>
                    {form.attend} <span className="font-medium text-[#151313]/40">{form.required}</span>
                </p>
                <div className="mt-[3.3cqw] grid grid-cols-2 gap-[3.3cqw]">
                    <span className={cn(ANSWER, 'border-[#3cc19b] bg-[#e6f7f0] text-[#1f8a6a]')}>
                        <CircleCheck className="size-[4.2cqw]" strokeWidth={2} />
                        {form.yes}
                    </span>
                    <span className={cn(ANSWER, 'border-[#ecd9c4] bg-white text-[#151313]/80')}>
                        <CircleX className="size-[4.2cqw]" strokeWidth={2} />
                        {form.no}
                    </span>
                </div>
                {/* Companions */}
                <p className={cn(LABEL, 'mt-[5cqw] text-center')}>{form.companions}</p>
                <div className="mt-[5.3cqw] flex flex-col gap-[3cqw]">
                    <Stepper label={form.adults} />
                    <Stepper label={form.children} />
                </div>
                {/* Message */}
                <p className={cn(LABEL, 'mt-[5.2cqw]')}>
                    {form.message} <span className="font-medium text-[#151313]/40">{form.optional}</span>
                </p>
                <p className="m-0 mt-[3.3cqw] h-[28cqw] rounded-[5cqw] bg-[#f8ece1] p-[4.4cqw] text-[4cqw] leading-snug text-[#151313]/35">
                    {form.placeholder}
                </p>
                <p className="m-0 mt-[3cqw] text-right text-[3.2cqw] text-[#151313]/45">{form.counter}</p>
                {/* Submit */}
                <span className="mt-[6cqw] flex h-[12.2cqw] items-center justify-center rounded-full bg-[linear-gradient(90deg,#f45fbf,#ff8c42)] text-[3.8cqw] font-semibold text-white">
                    {form.submit}
                </span>
            </div>
            <MockTabBar />
        </>
    );
}
