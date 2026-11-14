/**
 * Checkout module: the cart becomes a booking. Money here is display only, the server prices
 * the order at /payments/initiate, and `keyForCheckout` keeps one idempotency key per attempt.
 */

export {
    addressLabel,
    centreFor,
    DEFAULT_CENTRE,
    DEFAULT_DELTA,
    formatPlace,
    hasCoords,
    isPincode,
    LOCATION_DENIED,
    PINCODE_LENGTH,
    readServiceability,
    serviceabilityText,
    slotCoords,
    validateAddress,
} from './address';
export type { PickedPlace, PlaceParts, Serviceable } from './address';
export { addresses, checkoutSlots, initiateErrorBody, location, offers, payments, profile } from './api';
export { attemptName, checkoutAttemptKey, forgetCheckoutAttempt } from './attempt';
export {
    checkoutHint,
    checkoutReady,
    COULD_NOT_OPEN_MESSAGE,
    DISMISSED_MESSAGE,
    duplicateAssignment,
    duplicateMessage,
    initiateBody,
    initiateProblem,
    nextStep,
    PAY_ON_COLLECTION,
    PAYMENT_FAILED_MESSAGE,
    paymentOutcomeMessage,
    personKey,
    unavailableCodes,
    unavailableMessage,
    verifiedOutcome,
} from './checkout';
export type {
    CheckoutStep,
    InitiateErrorBody,
    InitiateInput,
    InitiateProblem,
    ReadinessInput,
    VerifiedOutcome,
} from './checkout';
export {
    AUTO_REFREEZE_AT_MS,
    formatCountdown,
    FREEZE_DURATION_MS,
    HOLD_EXPIRED,
    HOLD_NOTE,
    holdAnnouncement,
    holdLevel,
    holdMessage,
    lockButtonView,
    secondsLeft,
    shouldRefreeze,
    URGENT_AT_SECONDS,
    WARNING_AT_SECONDS,
} from './hold';
export type { HoldLevel, LockButtonView } from './hold';
export {
    collectionFeeNote,
    getCollectionFee,
    itemsTotal,
    orderTotals,
    payableView,
    payAtCollectionAmount,
    SAMPLE_COLLECTION_FEE,
    SAMPLE_COLLECTION_FEE_THRESHOLD,
    summaryLines,
} from './money';
export type { PayableView, SummaryLine, Totals } from './money';
export {
    dueLine,
    keepPolling,
    NEXT_STEPS,
    POLL_EVERY_MS,
    POLL_FOR_MS,
    resultView,
    SLOW_NOTE,
    viewFor,
} from './result';
export type { ResultTone, ResultView } from './result';
export { forgetCheckoutKey, keyForCheckout } from './store';
export type {
    AddressInput,
    AppliedPromo,
    AvailablePromo,
    CheckoutPaymentMethod,
    InitiateReply,
    MissingProfileFields,
    SavedAddress,
    ValidateReply,
    VerifyReply,
} from './types';
