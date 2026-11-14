/**
 * Camps module: walk-in health checkups. One person per registration, as on the website, with no
 * slot to choose. Money here is display only — the server prices the camp at /api/camps/checkout.
 */

export { campAttemptKey, campAttemptName, forgetCampAttempt } from './attempt';
export { camps, campErrorBody } from './api';
export {
    campAddress,
    campCityGroups,
    campDateRange,
    campPlace,
    campsCountLabel,
    campStatus,
    formatCampDate,
    parseCampDetail,
    parseCampList,
    testCount,
    testCountLabel,
} from './camps';
export type { CampCityGroup, CampStatus } from './camps';
export { dobFromPerson, dobKey, formatDob, isDobUsable, parseDobKey } from './dob';
export { mapLinks } from './maps';
export type { MapLinks } from './maps';
export { campPayCta, campSummaryLines, campTotals } from './money';
export type { CampTotals, CampTotalsInput } from './money';
export { campCheckoutBody, campHint, campProblem, campReady, nextCampStep } from './registration';
export type { CampCheckoutInput, CampProblem, CampReadiness, CampStep } from './registration';
export { CAMP_NO_CANCEL_NOTE, CAMP_VERIFY_FAILED, campResultView } from './result';
export type { CampResultView } from './result';
export { forgetCampKey, keyForCamp } from './store';
export type { ActiveCamp, CampCatalogItem, CampCheckoutErrorBody, CampCheckoutReply, CampDetail, CampItem } from './types';
