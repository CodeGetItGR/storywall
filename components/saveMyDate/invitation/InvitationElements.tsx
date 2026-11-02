import { InvitationElement } from '@/components/saveMyDate/invitation/InvitationElement';
import type { InvitationElement as Element } from '@/lib/invitation/elements';
import type { RenderContext, TextContrast } from '@/lib/invitation/render';

type InvitationElementsProps = {
    elements: Element[];
    contrast: TextContrast;
    ctx: RenderContext;
};

export function InvitationElements({ elements, contrast, ctx }: InvitationElementsProps) {
    return elements.map((element) => <InvitationElement key={element.id} element={element} contrast={contrast} ctx={ctx} />);
}
