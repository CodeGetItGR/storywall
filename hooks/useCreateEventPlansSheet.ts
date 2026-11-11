'use client';

import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useMemo, useState } from 'react';

import { useMarketingPlanOptions } from '@/hooks/useMarketingPlanOptions';
import { useModuleCopy } from '@/hooks/useModuleCopy';
import { type CompareLine, compareLine } from '@/lib/createEventPlanChoice';
import { leaveWizardEntry, pushWizardEntry } from '@/lib/createEventWizardHistory';
import { CREATE_EVENT_SHEET_PARAM, PLANS_SHEET, withWizardParams } from '@/lib/createEventWizardUrl';
import { pickedLandingDuration } from '@/lib/landingPricing';
import { useCreateEventForm } from '@/providers/createEvent/CreateEventFormContext';

// line: the feature line for a full plan, null for a lite one.
export type PlansSheetRow = { code: string; name: string; summary: string; line: string | null; price: string; months: number };

const FEATURE_SEPARATOR = ', ';

// The compare sheet: open while the URL has sheet=plans (its own history entry, so Back closes it),
// a pick that only counts once "Choose" is tapped, and its rows as plain values.
export function useCreateEventPlansSheet() {
    const t = useTranslations('CreateEventPage.wizard.plans');
    const tPage = useTranslations('CreateEventPage');
    const tPricing = useTranslations('LandingPage.pricing');
    const searchParams = useSearchParams();
    const { eventPlans, modules, media, selectedCode, durationPicks, onSelectPlan, selectedEventType } = useCreateEventForm();
    const { full, lite } = useMarketingPlanOptions({ plans: eventPlans, modules, media });
    const moduleCopy = useModuleCopy(selectedEventType);
    const isOpen = searchParams.get(CREATE_EVENT_SHEET_PARAM) === PLANS_SHEET;
    // A tapped row; null until then, so the sheet shows the plan picked on the step.
    const [tapped, setPending] = useState<string | null>(null);
    const pending = tapped ?? selectedCode;

    // Copy rows 37-39: "{features}", "{features} and more", "Everything in {plan}, plus {features}",
    // and the reused "Everything in {plan}".
    const lineText = useCallback(
        (line: CompareLine): string => {
            const names = (keys: string[]) => keys.map((key) => moduleCopy(key).name).join(FEATURE_SEPARATOR);
            if (line.kind === 'own') return line.more ? t('andMore', { features: names(line.keys) }) : names(line.keys);
            if (line.kind === 'plus') return t('everythingInPlus', { plan: line.previousName, features: names(line.keys) });
            return tPricing('everythingIn', { plan: line.previousName });
        },
        [moduleCopy, t, tPricing],
    );

    const fullRows: PlansSheetRow[] = useMemo(
        () =>
            full.map((option, index) => {
                const duration = pickedLandingDuration(option.presentation, option.presentation.defaultDurationId);
                return {
                    code: option.config.code,
                    name: option.presentation.name,
                    summary: `${option.presentation.audience} · ${option.presentation.storage}`,
                    line: lineText(compareLine(option.config, full[index - 1]?.config, selectedEventType)),
                    price: tPage('typeStartingPrice', { price: duration.price }),
                    months: duration.months,
                };
            }),
        [full, lineText, selectedEventType, tPage],
    );

    const liteRows: PlansSheetRow[] = useMemo(
        () =>
            lite.map((option) => {
                const duration = pickedLandingDuration(option.presentation, durationPicks[option.config.code]);
                return {
                    code: option.config.code,
                    name: option.presentation.name,
                    summary: '',
                    line: null,
                    price: duration.price,
                    months: duration.months,
                };
            }),
        [durationPicks, lite],
    );

    // Each opening starts on the plan picked on the step.
    const open = useCallback(() => {
        setPending(null);
        pushWizardEntry(withWizardParams(new URL(window.location.href), { [CREATE_EVENT_SHEET_PARAM]: PLANS_SHEET }), 'sheet');
    }, []);
    const close = useCallback(() => {
        leaveWizardEntry('sheet', withWizardParams(new URL(window.location.href), { [CREATE_EVENT_SHEET_PARAM]: null }));
    }, []);
    const choose = useCallback(() => {
        onSelectPlan(pending);
        setPending(null);
        close();
    }, [close, onSelectPlan, pending]);

    const pendingName = [...full, ...lite].find((option) => option.config.code === pending)?.presentation.name ?? '';
    return { isOpen, open, close, choose, pending, setPending, pendingName, fullRows, liteRows };
}
