import { House, Mail, Menu, Music, Settings, Share2 } from 'lucide-react';

import { cn } from '@/lib/utils';

const TABS = [
    { name: 'home', Icon: House },
    { name: 'music', Icon: Music },
    { name: 'mail', Icon: Mail },
    { name: 'share', Icon: Share2 },
    { name: 'settings', Icon: Settings },
    { name: 'menu', Icon: Menu },
] as const;

// The app's bottom bar on a drawn screen; home is the current tab.
export function MockTabBar() {
    return (
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-around border-t border-[#151313]/8 bg-white px-[3cqw] pt-[3cqw] pb-[5.5cqw]">
            {TABS.map(({ name, Icon }, index) => (
                <Icon className={cn('size-[5.8cqw]', index === 0 ? 'text-[#ff765f]' : 'text-[#151313]/45')} key={name} strokeWidth={1.8} />
            ))}
        </div>
    );
}
