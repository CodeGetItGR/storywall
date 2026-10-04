import Link from 'next/link';
import { Fragment } from 'react';

import { type MarkdownBlock, type MarkdownInline, parseMarkdown } from '@/lib/markdown';
import { cn } from '@/lib/utils';

const HEADING_CLASS_NAMES = {
    1: 'text-2xl font-bold text-ink',
    2: 'mt-2 text-lg font-bold text-ink',
    3: 'mt-1 text-base font-semibold text-ink',
    4: 'text-sm font-semibold text-ink',
    5: 'text-sm font-semibold text-ink',
    6: 'text-sm font-semibold text-ink',
} as const;

const LINK_CLASS_NAME = 'font-semibold break-words text-ink underline underline-offset-2 hover:text-primary';

function InlinePart({ part }: { part: MarkdownInline }) {
    const text = part.bold ? <strong className="font-semibold text-ink">{part.text}</strong> : part.text;
    if (!part.href) return text;
    if (part.href.startsWith('/')) {
        return (
            <Link href={part.href} className={LINK_CLASS_NAME}>
                {text}
            </Link>
        );
    }
    return (
        <a
            href={part.href}
            className={LINK_CLASS_NAME}
            {...(part.href.startsWith('https://') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        >
            {text}
        </a>
    );
}

function InlineText({ content }: { content: MarkdownInline[] }) {
    return (
        <>
            {content.map((part, index) => (
                <Fragment key={index}>
                    <InlinePart part={part} />
                </Fragment>
            ))}
        </>
    );
}

// "## 6. Harassment, threats and bullying" gets id="section-6": statement-of-reasons emails and
// the suspended-StoryWall view link to /legal/community-guidelines#section-N.
function sectionId(block: Extract<MarkdownBlock, { type: 'heading' }>): string | undefined {
    if (block.level !== 2) return undefined;
    const match = /^(\d+)\.\s/.exec(block.content.map((part) => part.text).join(''));
    return match ? `section-${match[1]}` : undefined;
}

// Renders the backend's Markdown legal texts as plain React nodes (no raw HTML).
export function MarkdownDocument({ source, className }: { source: string; className?: string }) {
    const blocks = parseMarkdown(source);

    return (
        <div className={cn('flex flex-col gap-3 text-sm leading-relaxed text-ink-muted', className)}>
            {blocks.map((block, index) => {
                if (block.type === 'heading') {
                    const Tag = `h${block.level}` as const;
                    return (
                        <Tag key={index} id={sectionId(block)} className={HEADING_CLASS_NAMES[block.level]}>
                            <InlineText content={block.content} />
                        </Tag>
                    );
                }
                if (block.type === 'list') {
                    const List = block.ordered ? 'ol' : 'ul';
                    return (
                        <List key={index} className={cn('flex flex-col gap-1 pl-5', block.ordered ? 'list-decimal' : 'list-disc')}>
                            {block.items.map((item, itemIndex) => (
                                <li key={itemIndex}>
                                    <InlineText content={item} />
                                </li>
                            ))}
                        </List>
                    );
                }
                return (
                    <p key={index}>
                        <InlineText content={block.content} />
                    </p>
                );
            })}
        </div>
    );
}
