import { type ReactNode } from 'react';

import { LiteHomeLayout } from '@/components/liteHome/LiteHomeLayout';

export default function Layout({ children }: { children: ReactNode }) {
    return <LiteHomeLayout>{children}</LiteHomeLayout>;
}
