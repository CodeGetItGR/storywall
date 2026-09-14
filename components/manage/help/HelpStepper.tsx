import type { ReactNode } from 'react';

export function HelpStepper({ children }: { children: ReactNode }) {
    return <ol className="flex flex-col pl-3">{children}</ol>;
}
