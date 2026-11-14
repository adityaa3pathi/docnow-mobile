// The five stages the website's stepper shows, turned into rows the app can list.
import type { LabStatusInfo } from './status';

export const LAB_STAGES = [
    { key: 'booked', label: 'Booked' },
    { key: 'scheduled', label: 'Scheduled' },
    { key: 'assigned', label: 'Collector assigned' },
    { key: 'collected', label: 'Sample collected' },
    { key: 'report', label: 'Report ready' },
] as const;

export type StageState = 'done' | 'current' | 'upcoming';

export interface TimelineStage {
    key: string;
    label: string;
    state: StageState;
}

export interface Timeline {
    stages: TimelineStage[];
    /** A stopped booking (cancelled, refunded, superseded) has no journey left to show. */
    stopped: boolean;
    message: string;
    subMessage?: string;
}

export function buildTimeline(info: LabStatusInfo): Timeline {
    const step = Number.isFinite(info.step) ? info.step : 0;
    const stopped = step <= 0;
    const stages = LAB_STAGES.map((stage, index) => {
        const position = index + 1;
        const state: StageState = stopped || position > step ? 'upcoming' : position === step ? 'current' : 'done';
        return { key: stage.key, label: stage.label, state };
    });
    return { stages, stopped, message: info.message, subMessage: info.subMessage };
}
