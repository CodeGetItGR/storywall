'use client';

import { useTranslations } from 'next-intl';
import { type ChangeEvent, useState } from 'react';

import { useCampaignLinkWords } from '@/hooks/useCampaignLinkWords';
import type { CampaignLinkDto, CampaignLinkLanguage, CampaignPlacement } from '@/lib/api/types';
import { transliterate } from '@/lib/campaignForm';
import {
    CAMPAIGN_LINK_LANGUAGES,
    CAMPAIGN_PLACEMENTS,
    campaignLinksRequest,
    campaignPageOptions,
    isPlacementAdded,
    isUtmValue,
    toUtmValue,
} from '@/lib/campaignLinks';

export type CampaignLinkPickerProblem = 'partnerName' | 'source' | 'medium';

// What's typed for Partner and Other, as a utm value as it's typed. Greek is spelled in Latin letters.
function utmOf(raw: string): string {
    return toUtmValue(transliterate(raw));
}

// The first typed value a ticked placement still needs.
function problemOf(
    chosen: ReadonlySet<CampaignPlacement>,
    partnerName: string,
    utmSource: string,
    utmMedium: string,
): CampaignLinkPickerProblem | null {
    if (chosen.has('PARTNER') && !isUtmValue(partnerName)) return 'partnerName';
    if (chosen.has('OTHER') && !isUtmValue(utmSource)) return 'source';
    if (chosen.has('OTHER') && !isUtmValue(utmMedium)) return 'medium';
    return null;
}

// The link picker: placements ticked as icon chips, the languages, one page, and a partner's name or a
// source and medium when those are ticked. linkName and links are the campaign's, so a placement it
// already has on the chosen page, in every chosen language, can't be ticked again.
export function useCampaignLinkPicker(linkName: string, links: readonly CampaignLinkDto[]) {
    const t = useTranslations('AdminPage.campaigns');
    const words = useCampaignLinkWords();
    // Read once: the pages don't change while the picker is open.
    const [pages] = useState(campaignPageOptions);
    const [placements, setPlacements] = useState<ReadonlySet<CampaignPlacement>>(() => new Set());
    const [languages, setLanguages] = useState<readonly CampaignLinkLanguage[]>(CAMPAIGN_LINK_LANGUAGES);
    const [pageKey, setPageKey] = useState<string | null>(null);
    const [partnerName, setPartnerName] = useState('');
    const [utmSource, setUtmSource] = useState('');
    const [utmMedium, setUtmMedium] = useState('');
    // Problems show once the admin tries to save, not while they type.
    const [shown, setShown] = useState(false);

    const page = pages.find((option) => option.key === pageKey) ?? pages[0];

    const options = CAMPAIGN_PLACEMENTS.map((option) => {
        const added = isPlacementAdded(option, languages, page.key, linkName, links);
        const name = words.placement(option);
        return {
            option,
            added,
            // A placement the campaign already has shows ticked, and can't be unticked or sent again.
            checked: added || placements.has(option.placement),
            name: added ? `${name} · ${t('picker.added')}` : name,
        };
    });
    const chosen = new Set(options.filter((entry) => entry.checked && !entry.added).map((entry) => entry.option.placement));
    const problem = problemOf(chosen, partnerName, utmSource, utmMedium);
    const request =
        chosen.size > 0 && problem === null ? campaignLinksRequest({ placements: chosen, languages, page, partnerName, utmSource, utmMedium }) : null;

    // The last ticked language can't be unticked.
    const languageOptions = CAMPAIGN_LINK_LANGUAGES.map((language) => {
        const checked = languages.includes(language);
        return { language, checked, disabled: checked && languages.length === 1 };
    });

    // An occasion page is named by its path, so no wording is needed per occasion.
    const pageOptions = pages.map((option) => ({
        value: option.key ?? '',
        label: option.kind === 'occasion' ? `${t('pages.occasion')} · ${option.paths.en}` : t(`pages.${option.kind}`),
    }));

    function handlePlacementChange(event: ChangeEvent<HTMLInputElement>) {
        const placement = event.currentTarget.value as CampaignPlacement;
        const checked = event.currentTarget.checked;
        setPlacements((current) => {
            const next = new Set(current);
            if (checked) next.add(placement);
            else next.delete(placement);
            return next;
        });
    }

    function handleLanguageChange(event: ChangeEvent<HTMLInputElement>) {
        const language = event.currentTarget.value as CampaignLinkLanguage;
        const checked = event.currentTarget.checked;
        setLanguages((current) => CAMPAIGN_LINK_LANGUAGES.filter((value) => (value === language ? checked : current.includes(value))));
    }

    function handlePageChange(event: ChangeEvent<HTMLSelectElement>) {
        setPageKey(event.currentTarget.value || null);
    }

    function handlePartnerNameChange(event: ChangeEvent<HTMLInputElement>) {
        setPartnerName(utmOf(event.currentTarget.value));
    }

    function handleSourceChange(event: ChangeEvent<HTMLInputElement>) {
        setUtmSource(utmOf(event.currentTarget.value));
    }

    function handleMediumChange(event: ChangeEvent<HTMLInputElement>) {
        setUtmMedium(utmOf(event.currentTarget.value));
    }

    // True when nothing ticked is missing a typed value. Nothing ticked at all is fine for a new campaign.
    function validate(): boolean {
        setShown(true);
        return problem === null;
    }

    function reset() {
        setPlacements(new Set());
        setLanguages(CAMPAIGN_LINK_LANGUAGES);
        setPageKey(null);
        setPartnerName('');
        setUtmSource('');
        setUtmMedium('');
        setShown(false);
    }

    return {
        options,
        languageOptions,
        pageOptions,
        pageValue: page.key ?? '',
        partnerName,
        utmSource,
        utmMedium,
        showsPartner: chosen.has('PARTNER'),
        showsOther: chosen.has('OTHER'),
        problem: shown ? problem : null,
        chosenCount: chosen.size,
        request,
        validate,
        reset,
        handlePlacementChange,
        handleLanguageChange,
        handlePageChange,
        handlePartnerNameChange,
        handleSourceChange,
        handleMediumChange,
    };
}
