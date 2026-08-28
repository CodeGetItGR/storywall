'use client';

import { use } from 'react';

import StoryBoundary from './StoryBoundary';

export default function StoryPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);

    return <StoryBoundary id={id} />;
}
