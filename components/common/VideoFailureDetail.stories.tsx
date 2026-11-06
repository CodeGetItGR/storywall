import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { VideoFailureDetail } from '@/components/common/VideoFailureDetail';

const meta = {
    title: 'Common/VideoFailureDetail',
    component: VideoFailureDetail,
} satisfies Meta<typeof VideoFailureDetail>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DurationExceeded: Story = {
    args: { metadata: { processingError: 'VIDEO_DURATION_EXCEEDED' } },
};

export const StoryDurationExceeded: Story = {
    args: { metadata: { processingError: 'STORY_DURATION_EXCEEDED' } },
};

export const ResolutionExceeded: Story = {
    args: { metadata: { processingError: 'VIDEO_RESOLUTION_EXCEEDED' } },
};

export const TranscodeTimeout: Story = {
    args: { metadata: { processingError: 'TRANSCODE_TIMEOUT' } },
};
