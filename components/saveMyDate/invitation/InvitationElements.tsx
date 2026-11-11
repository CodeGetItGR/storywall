import { Fragment } from 'react';

import { InvitationElement } from '@/components/saveMyDate/invitation/InvitationElement';
import type { InvitationElement as Element } from '@/lib/invitation/elements';
import type { RenderContext, TextContrast } from '@/lib/invitation/render';

type InvitationElementsProps = {
    elements: Element[];
    contrast: TextContrast;
    ctx: RenderContext;
    // The custom section these are items of: the editor puts move arrows around each one.
    custom?: { id: string; elements: readonly Element[] };
};

export function InvitationElements({ elements, contrast, ctx, custom }: InvitationElementsProps) {
    const wrap = custom ? ctx.canvasTools?.customItem : undefined;
    return elements.map((element) => {
        const content = <InvitationElement key={element.id} element={element} contrast={contrast} ctx={ctx} />;
        return wrap && custom ? <Fragment key={element.id}>{wrap(custom.id, custom.elements, element, content)}</Fragment> : content;
    });
}
