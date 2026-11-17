import { describe, expect, it } from 'vitest';

import { getLabStatusDisplay } from './status';
import { LAB_STAGES, buildTimeline } from './timeline';

const timelineFor = (status: string) => buildTimeline(getLabStatusDisplay(status));
const states = (status: string) => timelineFor(status).stages.map((s) => s.state);

describe('status timeline', () => {
    it('keeps one row per stage', () => {
        expect(timelineFor('BS002').stages).toHaveLength(LAB_STAGES.length);
    });

    it('marks the booked stage as current on a new booking', () => {
        expect(states('Order Booked')).toEqual(['current', 'upcoming', 'upcoming', 'upcoming', 'upcoming']);
    });

    it('marks earlier stages done once the collector is assigned', () => {
        expect(states('Sample Collector Assigned')).toEqual(['done', 'done', 'current', 'upcoming', 'upcoming']);
    });

    it('fills every stage once the report is ready', () => {
        expect(states('Report Available')).toEqual(['done', 'done', 'done', 'done', 'current']);
    });

    it('stops the journey on a cancelled booking and leaves no stage ticked', () => {
        const timeline = timelineFor('Cancelled');
        expect(timeline.stopped).toBe(true);
        expect(timeline.stages.every((s) => s.state === 'upcoming')).toBe(true);
    });

    it('carries the status message and any extra line', () => {
        const timeline = timelineFor('Rescheduled');
        expect(timeline.message).toBe('Your collection slot has been updated.');
        expect(timeline.subMessage?.length ?? 0).toBeGreaterThan(0);
    });

    it('treats a missing step as a stopped journey rather than guessing', () => {
        const timeline = buildTimeline({ label: 'Odd', tone: 'muted', step: Number.NaN, message: 'No step.' });
        expect(timeline.stopped).toBe(true);
    });
});
