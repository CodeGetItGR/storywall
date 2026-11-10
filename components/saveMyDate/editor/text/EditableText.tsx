'use client';

import { useTranslations } from 'next-intl';

import { ActiveText } from '@/components/saveMyDate/editor/text/ActiveText';
import { useTextEditing } from '@/components/saveMyDate/editor/text/TextEditingContext';
import { useEditableText } from '@/hooks/useEditableText';
import type { InvitationTextProps } from '@/lib/invitation/textEditing';
import { cn } from '@/lib/utils';

// A text of the invitation on the editor canvas. A tap or Enter opens it for typing in place.
export function EditableText(props: InvitationTextProps) {
    const t = useTranslations('InvitationEditor');
    const edit = useTextEditing();
    const text = useEditableText(edit, props.target);
    const { tag: Tag, className, style, value, display } = props;
    // A date part left empty still shows the date's own text, so it is not an empty box.
    const shown = display ?? value;
    const isEmpty = shown.trim() === '';

    if (text.isActive) {
        return (
            <ActiveText
                key="active"
                textKey={text.key}
                label={t('textBox')}
                tag={Tag}
                className={className}
                style={style}
                value={value}
                caret={edit.caret}
                onElement={edit.setElement}
                onChange={edit.setText}
                onUndo={edit.undo}
                onRedo={edit.redo}
                onDone={text.done}
                onToolbar={edit.focusToolbar}
            />
        );
    }

    return (
        <Tag
            key="idle"
            data-smd-text={text.key}
            role="button"
            tabIndex={0}
            aria-label={isEmpty ? t('emptyText') : undefined}
            className={cn(className, 'smd-text', isEmpty && 'smd-text-empty')}
            style={style}
            onClick={text.open}
            onKeyDown={text.openWithKey}
        >
            {shown}
        </Tag>
    );
}
