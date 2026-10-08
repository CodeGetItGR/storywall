'use client';

import { Combobox } from '@base-ui/react/combobox';
import { Check, ChevronDown, Search } from 'lucide-react';

import type { LandingPricingEventType, LandingPricingGroup } from '@/hooks/useLandingPricingPlans';

type LandingPricingEventSelectProps = {
    groups: LandingPricingGroup[];
    value: LandingPricingEventType;
    onValueChangeAction: (eventType: LandingPricingEventType | null) => void;
    label: string;
    searchPlaceholder: string;
    emptyLabel: string;
};

const eventTypeLabel = (eventType: LandingPricingEventType) => eventType.label;
const isSameEventType = (item: LandingPricingEventType, value: LandingPricingEventType) => item.id === value.id;

// One searchable list of event types, grouped by category. The trigger names the type shown.
export function LandingPricingEventSelect({
    groups,
    value,
    onValueChangeAction,
    label,
    searchPlaceholder,
    emptyLabel,
}: LandingPricingEventSelectProps) {
    return (
        <Combobox.Root
            autoHighlight
            isItemEqualToValue={isSameEventType}
            itemToStringLabel={eventTypeLabel}
            items={groups}
            onValueChange={onValueChangeAction}
            value={value}
        >
            {/* Label */}
            <Combobox.Label className="text-[13px] font-black tracking-[.15em] text-[#151313] uppercase">{label}</Combobox.Label>

            {/* Trigger */}
            <Combobox.Trigger className="group mt-3 inline-flex min-h-14 max-w-full items-center gap-4 rounded-full border-2 border-[#151313] bg-white py-2 pr-2 pl-7 text-[18px] font-black text-[#151313] shadow-[0_8px_24px_rgba(21,19,19,.08)] focus-ring transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(21,19,19,.14)] focus-visible:outline-offset-4 motion-reduce:transition-none min-[761px]:min-h-16 min-[761px]:text-[22px]">
                <span className="truncate">{value.label}</span>
                <span
                    aria-hidden="true"
                    className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#df7794,#f2c764)] text-white min-[761px]:size-11"
                >
                    <ChevronDown
                        className="size-5 transition-transform group-data-[popup-open]:rotate-180 motion-reduce:transition-none"
                        strokeWidth={3}
                    />
                </span>
            </Combobox.Trigger>

            <Combobox.Portal>
                <Combobox.Positioner align="center" className="z-50 outline-none" sideOffset={8}>
                    <Combobox.Popup className="flex max-h-[min(26rem,var(--available-height))] w-[min(20rem,calc(100vw-40px))] flex-col overflow-hidden rounded-3xl border border-[#151313]/10 bg-white text-[#151313] shadow-[0_18px_50px_rgba(21,19,19,.16)] outline-none">
                        {/* Search */}
                        <label className="flex items-center gap-2 border-b border-[#151313]/10 px-4">
                            <Search aria-hidden="true" className="size-4 shrink-0 text-[#151313]/55" />
                            <Combobox.Input
                                aria-label={searchPlaceholder}
                                className="min-h-12 w-full bg-transparent text-base outline-none placeholder:text-[#151313]/50"
                                placeholder={searchPlaceholder}
                            />
                        </label>

                        <Combobox.Empty className="px-4 py-5 text-center text-sm text-[#151313]/65 empty:hidden">{emptyLabel}</Combobox.Empty>

                        {/* Event types */}
                        <Combobox.List className="overflow-y-auto overscroll-contain p-2 empty:hidden">
                            {(group: LandingPricingGroup) => (
                                <Combobox.Group className="pb-1 last:pb-0" items={group.items} key={group.id}>
                                    <Combobox.GroupLabel className="px-3 pt-3 pb-1.5 text-[11px] font-black tracking-[.15em] text-[#151313]/55 uppercase">
                                        {group.label}
                                    </Combobox.GroupLabel>
                                    <Combobox.Collection>
                                        {(eventType: LandingPricingEventType) => (
                                            <Combobox.Item
                                                className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-2xl px-3 text-[15px] font-semibold outline-none select-none data-[highlighted]:bg-[#151313]/6 data-[selected]:font-black"
                                                key={eventType.id}
                                                value={eventType}
                                            >
                                                <span>{eventType.label}</span>
                                                <Combobox.ItemIndicator>
                                                    <Check aria-hidden="true" className="size-4 text-[#df7794]" strokeWidth={3} />
                                                </Combobox.ItemIndicator>
                                            </Combobox.Item>
                                        )}
                                    </Combobox.Collection>
                                </Combobox.Group>
                            )}
                        </Combobox.List>
                    </Combobox.Popup>
                </Combobox.Positioner>
            </Combobox.Portal>
        </Combobox.Root>
    );
}
