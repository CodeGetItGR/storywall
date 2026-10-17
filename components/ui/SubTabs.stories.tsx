import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Images, MessageSquare, Users } from 'lucide-react';
import { useState } from 'react';
import { fn } from 'storybook/test';

import { type SubTabItem, SubTabs } from '@/components/ui/SubTabs';

type TabKey = 'posts' | 'media' | 'guests';

const TABS: SubTabItem<TabKey>[] = [
    { key: 'posts', label: 'Posts', icon: MessageSquare },
    { key: 'media', label: 'Media', icon: Images },
    { key: 'guests', label: 'Guests', icon: Users },
];

const meta = {
    title: 'UI/SubTabs',
    component: SubTabs<TabKey>,
    args: { tabs: TABS, active: 'posts', onSelectAction: fn() },
} satisfies Meta<typeof SubTabs<TabKey>>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SecondActive: Story = {
    args: { active: 'media' },
};

function InteractiveSubTabs() {
    const [active, setActive] = useState<TabKey>('posts');
    return <SubTabs tabs={TABS} active={active} onSelectAction={setActive} />;
}

export const Interactive: Story = {
    render: () => <InteractiveSubTabs />,
};
