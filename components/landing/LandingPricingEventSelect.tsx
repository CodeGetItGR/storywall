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
            <Combobox.Label className="text-[15px] font-semibold text-[#151313]">{label}</Combobox.Label>

            {/* Trigger */}
            <Combobox.Trigger className="mt-3 flex min-h-13 w-full items-center justify-between gap-3 rounded-full border border-[#151313]/20 bg-white px-6 text-[16px] font-black text-[#151313] focus-ring transition-colors hover:border-[#151313]/45 focus-visible:outline-offset-4 data-[popup-open]:border-[#151313]/45 min-[761px]:text-[17px]">
                <span className="truncate">{value.label}</span>
                <ChevronDown aria-hidden="true" className="size-4.5 shrink-0" strokeWidth={2.5} />
            </Combobox.Trigger>

            <Combobox.Portal>
                <Combobox.Positioner align="center" className="z-50 outline-none" sideOffset={8}>
                    <Combobox.Popup className="flex max-h-[min(26rem,var(--available-height))] w-(--anchor-width) flex-col overflow-hidden rounded-3xl border border-[#151313]/10 bg-white text-[#151313] shadow-[0_18px_50px_rgba(21,19,19,.16)] outline-none">
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
