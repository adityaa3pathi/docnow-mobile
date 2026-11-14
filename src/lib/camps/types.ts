/** Shapes the camp endpoints return. The server owns the price and every discount. */

export interface CampCatalogItem {
    id: string;
    name: string;
    partnerCode: string;
    type: string;
    description?: string | null;
    displayPrice?: number | null;
}

export interface CampItem {
    id: string;
    catalogItemId: string;
    catalogItem: CampCatalogItem;
}

/** One row of GET /api/camps/active. */
export interface ActiveCamp {
    id: string;
    name: string;
    description: string | null;
    location: string;
    city: string;
    startDate: string;
    endDate: string;
    price: number;
    _count?: { items?: number };
}

/** GET /api/camps/:id — the same row plus its pincode and the tests it includes. */
export interface CampDetail extends ActiveCamp {
    pincode: string;
    isActive?: boolean;
    items: CampItem[];
}

/** POST /api/camps/checkout. An online reply carries paise; a free one carries a status. */
export interface CampCheckoutReply {
    bookingId?: string;
    razorpayOrderId?: string;
    amount?: number;
    currency?: string;
    keyId?: string;
    status?: string;
    idempotent?: boolean;
}

/** The camp checkout's own error body, which carries the code that says what went wrong. */
export interface CampCheckoutErrorBody {
    code?: string;
    error?: string;
    missingFields?: { name?: boolean; gender?: boolean; age?: boolean };
    disabledItems?: { name: string }[];
}
