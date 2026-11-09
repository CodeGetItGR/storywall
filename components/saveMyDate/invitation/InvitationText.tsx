import { createContext, type CSSProperties, type ElementType, type ReactNode, useContext } from 'react';

import type { TextTarget } from '@/lib/invitation/textEditing';

export type InvitationTextProps = {
    target: TextTarget;
    // What is stored.
    value: string;
    // What guests read, when it differs from what is stored (date labels in capitals).
    display?: string;
    tag: ElementType;
    className: string;
    style: CSSProperties;
};

// The editor puts its editable text here. Guests' pages leave it empty, so the
// renderer never loads the editor's code.
export const EditableTextContext = createContext<((props: InvitationTextProps) => ReactNode) | null>(null);

// A text of the invitation: plain for guests, editable in place in the editor.
export function InvitationText(props: InvitationTextProps) {
    const renderEditable = useContext(EditableTextContext);
    if (renderEditable) return renderEditable(props);
    const { tag: Tag, className, style, value, display } = props;
    return (
        <Tag className={className} style={style}>
            {display ?? value}
        </Tag>
    );
}
