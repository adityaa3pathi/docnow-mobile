/** Shapes the checkout endpoints send and take. Every amount here is decided by the server. */

export interface SavedAddress {
    id: string;
    line1: string;
    city: string;
    pincode: string;
    lat?: string | null;
    long?: string | null;
}

export interface AddressInput {
    line1: string;
    city: string;
    pincode: string;
    lat?: string | null;
    long?: string | null;
}

/** POST /api/promos/validate. The discount shown is the server's own number. */
export interface AppliedPromo {
    code: string;
    discountAmount: number;
    finalAmount: number;
    promoCodeId: string;
    description?: string | null;
    discountType: string;
    discountValue: number;
}

export interface AvailablePromo {
    id: string;
    code: string;
    description: string | null;
    discountType: 'PERCENTAGE' | 'FLAT';
    discountValue: number;
    maxDiscount: number | null;
    minOrderValue: number;
    expiresAt: string | null;
}

export type CheckoutPaymentMethod = 'ONLINE' | 'PAY_ON_COLLECTION';

/** POST /api/payments/initiate. Online replies carry paise; pay on collection carries rupees. */
export interface InitiateReply {
    bookingId?: string;
    razorpayOrderId?: string;
    amount?: number;
    currency?: string;
    keyId?: string;
    status?: string;
    paymentMethod?: string;
    idempotent?: boolean;
}

export interface VerifyReply {
    status?: string;
    message?: string;
}

/** POST /api/payments/validate — which cart lines the lab cannot take at this address. */
export interface ValidateReply {
    valid?: boolean;
    bookable?: string[];
    unavailable?: { testCode: string; testName: string }[];
}

export interface MissingProfileFields {
    name?: boolean;
    gender?: boolean;
    age?: boolean;
}
