'use client';

import { AccountChangeEmail } from '@/components/event/create/wizard/account/AccountChangeEmail';
import { AccountChoose } from '@/components/event/create/wizard/account/AccountChoose';
import { AccountCode } from '@/components/event/create/wizard/account/AccountCode';
import { AccountSignIn } from '@/components/event/create/wizard/account/AccountSignIn';
import { AccountSignUp } from '@/components/event/create/wizard/account/AccountSignUp';
import { useAuth } from '@/hooks/useAuth';
import { useCreateEventWizardAccount } from '@/hooks/useCreateEventWizardAccount';
import { useCreateEventWizardAccountPreview } from '@/hooks/useCreateEventWizardAccountPreview';
import { useEmailCode } from '@/hooks/useEmailCode';
import { useLoginForm } from '@/hooks/useLoginForm';
import type { AccountView } from '@/lib/createEventWizardAccount';

// The account step: picks the screen from the `account` param.
export function AccountStep() {
    const { view, open, show, onSignedIn, isFinishingSignIn } = useCreateEventWizardAccount();
    const { user } = useAuth();
    const preview = useCreateEventWizardAccountPreview();
    const oauth = useLoginForm({ inviteToken: null, initialEmail: '', onSignedIn });

    // Signed in but unverified: only the code screens apply.
    if (user && (view === 'code' || view === 'email')) return <AccountCodeScreens view={view} show={show} />;
    if (view === 'signup') return <AccountSignUp onSignedIn={onSignedIn} isFinishing={isFinishingSignIn} />;
    if (view === 'signin') return <AccountSignIn onSignedIn={onSignedIn} isFinishing={isFinishingSignIn} />;
    return <AccountChoose preview={preview} oauth={oauth} onOpen={open} />;
}

// The code and change-email screens share one useEmailCode, so the countdown survives switching.
function AccountCodeScreens({ view, show }: { view: 'code' | 'email'; show: (view: AccountView) => void }) {
    const emailCode = useEmailCode();

    function showCode() {
        show('code');
    }

    function showChangeEmail() {
        show('email');
    }

    return view === 'email' ? (
        <AccountChangeEmail emailCode={emailCode} onDone={showCode} />
    ) : (
        <AccountCode emailCode={emailCode} onChangeEmail={showChangeEmail} />
    );
}
