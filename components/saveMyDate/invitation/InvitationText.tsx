import type { InvitationTextProps, TextRenderer } from '@/lib/invitation/textEditing';

type Props = InvitationTextProps & {
    // The editor's own drawing of a text, from the render context. Guests' pages have none,
    // so they render plain text on the server and never load the editor's code.
    render?: TextRenderer;
};

// A text of the invitation: plain for guests, editable in place in the editor.
export function InvitationText({ render, ...props }: Props) {
    if (render) return render(props);
    const { tag: Tag, className, style, value, display } = props;
    return (
        <Tag className={className} style={style}>
            {display ?? value}
        </Tag>
    );
}
