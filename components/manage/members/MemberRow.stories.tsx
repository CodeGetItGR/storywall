import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useLocale, useTranslations } from 'next-intl';
import { expect, fn, userEvent, within } from 'storybook/test';

import { withAppContext } from '@/.storybook/appContext';
import { copyFor } from '@/.storybook/copy';
import { storyHostMember, storyMember } from '@/.storybook/fixtures';
import { waitForOpen } from '@/.storybook/waitForOpen';
import { MemberRow } from '@/components/manage/members/MemberRow';
import type { EventMemberResponseDto } from '@/lib/api/types';
import { formatDate } from '@/lib/datetime';

const anna = storyMember({ id: 'mem-anna', displayName: 'Anna Kosta', userId: 'usr-anna', customRelationshipRole: 'Bride’s friend' });

type RowStoryProps = {
    member: EventMemberResponseDto;
    canPromote: boolean;
    canReport: boolean;
    canRemove: boolean;
    onPromoteAction: (member: EventMemberResponseDto) => void;
    onReportAction: (member: EventMemberResponseDto) => void;
    onRemoveAction: (member: EventMemberResponseDto) => void;
};

// The row with the app's own labels, as the Members list passes them.
function LocalizedMemberRow({ member, ...rest }: RowStoryProps) {
    const t = useTranslations('ManagePage.members');
    const tRoles = useTranslations('MemberRoles');
    const locale = useLocale();

    return (
        <ul>
            <MemberRow
                member={member}
                eventTypeKey="WEDDING"
                joinedLabel={t('joined', { date: formatDate(locale, member.joinedAt, { dateStyle: 'medium' }) })}
                moreLabel={t('moreFor', { name: member.displayName })}
                editRoleLabel={tRoles('host.edit', { name: member.displayName })}
                promoteLabel={t('promote')}
                reportLabel={t('report')}
                removeLabel={t('remove')}
                {...rest}
            />
        </ul>
    );
}

const meta = {
    title: 'Manage/Members/MemberRow',
    component: LocalizedMemberRow,
    decorators: [
        (Story) => (
            <div className="max-w-[560px] p-5">
                <Story />
            </div>
        ),
        withAppContext,
    ],
    parameters: { app: { member: storyHostMember } },
    args: {
        member: anna,
        canPromote: true,
        canReport: true,
        canRemove: true,
        onPromoteAction: fn(),
        onReportAction: fn(),
        onRemoveAction: fn(),
    },
} satisfies Meta<typeof LocalizedMemberRow>;

export default meta;
type Story = StoryObj<typeof meta>;

// Role and joined date on one line.
export const WithRole: Story = {
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByText(/Bride’s friend · /)).toBeVisible();
    },
};

// No role: the joined date alone.
export const WithoutRole: Story = {
    args: { member: storyMember({ id: 'mem-petros', displayName: 'Petros Ioannou', userId: 'usr-petros' }) },
};

// Nothing the viewer can do: no ⋯ button.
export const NoActions: Story = {
    args: { canPromote: false, canReport: false, canRemove: false },
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).queryByRole('button')).not.toBeInTheDocument();
    },
};

// The ⋯ menu open: Make co-host, Report and Remove.
export const MenuOpen: Story = {
    play: async ({ canvasElement, globals }) => {
        const label = copyFor(globals).ManagePage.members.moreFor.replace('{name}', anna.displayName);
        await userEvent.click(within(canvasElement).getByRole('button', { name: label }));
        await waitForOpen('menu');
    },
};
