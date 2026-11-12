'use client';

import { BackgroundSettings } from '@/components/saveMyDate/editor/settings/BackgroundSettings';
import { ContactSettings } from '@/components/saveMyDate/editor/settings/ContactSettings';
import { CoupleContactSettings } from '@/components/saveMyDate/editor/settings/CoupleContactSettings';
import { DateSettings } from '@/components/saveMyDate/editor/settings/DateSettings';
import { DressCodeSettings } from '@/components/saveMyDate/editor/settings/DressCodeSettings';
import { EffectSettings, TransitionSettings } from '@/components/saveMyDate/editor/settings/EffectSettings';
import { FollowEventSettings } from '@/components/saveMyDate/editor/settings/FollowEventSettings';
import { FooterSettings } from '@/components/saveMyDate/editor/settings/FooterSettings';
import { LinkButtonsSettings } from '@/components/saveMyDate/editor/settings/LinkButtonsSettings';
import { LocationsSettings } from '@/components/saveMyDate/editor/settings/LocationsSettings';
import { ProgramItemsSettings } from '@/components/saveMyDate/editor/settings/ProgramItemsSettings';
import { SectionStyleSettings } from '@/components/saveMyDate/editor/settings/SectionStyleSettings';
import { StaysSettings } from '@/components/saveMyDate/editor/settings/StaysSettings';
import type { SectionOf, SettingsScope } from '@/hooks/useSectionSettingsPanel';
import type { SectionType } from '@/lib/invitation/sections';
import type { SettingsGroup } from '@/lib/invitation/sectionSettings';
import {
    COUNTDOWN_FIELDS,
    FAQ_FIELDS,
    PROGRAM_FIELDS,
    PROGRAM_ICONS_FIELDS,
    RSVP_FIELDS,
    STAY_BOX_FIELDS,
} from '@/lib/invitation/sectionStyleFields';

type SectionSettingsGroupsProps = {
    scope: SettingsScope;
    groups: SettingsGroup[];
};

// Narrows the scope to one section type; the groups list already matches the type.
function scopeOf<T extends SectionType>(scope: SettingsScope, type: T): SettingsScope<SectionOf<T>> | null {
    return scope.section.type === type ? (scope as SettingsScope<SectionOf<T>>) : null;
}

function programScope(scope: SettingsScope): SettingsScope<SectionOf<'program'> | SectionOf<'programIcons'>> | null {
    return scopeOf(scope, 'program') ?? scopeOf(scope, 'programIcons');
}

// Every settings group of the open section, in order.
export function SectionSettingsGroups({ scope, groups }: SectionSettingsGroupsProps) {
    return groups.map((group) => <SettingsGroupContent key={group} scope={scope} group={group} />);
}

function SettingsGroupContent({ scope, group }: { scope: SettingsScope; group: SettingsGroup }) {
    switch (group) {
        case 'follow':
            return <FollowEventSettings scope={scope} />;
        case 'date': {
            const date = scopeOf(scope, 'date');
            return date && <DateSettings scope={date} />;
        }
        case 'countdown':
            return <SectionStyleSettings scope={scope} groups={COUNTDOWN_FIELDS} />;
        case 'faq':
            return <SectionStyleSettings scope={scope} groups={FAQ_FIELDS} />;
        case 'rsvp':
            return <SectionStyleSettings scope={scope} groups={RSVP_FIELDS} />;
        case 'programItems': {
            const program = programScope(scope);
            return program && <ProgramItemsSettings scope={program} />;
        }
        case 'programStyle':
            return <SectionStyleSettings scope={scope} groups={scope.section.type === 'programIcons' ? PROGRAM_ICONS_FIELDS : PROGRAM_FIELDS} />;
        case 'stays': {
            const stays = scopeOf(scope, 'accommodation');
            return stays && <StaysSettings scope={stays} />;
        }
        case 'stayBox':
            return <SectionStyleSettings scope={scope} groups={STAY_BOX_FIELDS} />;
        case 'contact': {
            const contact = scopeOf(scope, 'contact');
            return contact && <ContactSettings scope={contact} />;
        }
        case 'coupleContact': {
            const couple = scopeOf(scope, 'coupleContact');
            return couple && <CoupleContactSettings scope={couple} />;
        }
        case 'locations': {
            const locations = scopeOf(scope, 'locations');
            return locations && <LocationsSettings scope={locations} />;
        }
        case 'dressCode': {
            const dressCode = scopeOf(scope, 'dressCode');
            return dressCode && <DressCodeSettings scope={dressCode} />;
        }
        case 'buttons':
            return <LinkButtonsSettings scope={scope} />;
        case 'footer': {
            const footer = scopeOf(scope, 'footer');
            return footer && <FooterSettings scope={footer} />;
        }
        case 'background':
            return <BackgroundSettings scope={scope} />;
        case 'effect':
            return <EffectSettings scope={scope} />;
        case 'transition':
            return <TransitionSettings scope={scope} />;
    }
}
