export type CatalogItemType = 'TEST' | 'PACKAGE' | 'PROFILE';

export interface CatalogItem {
  id: string;
  partnerCode: string;
  name: string;
  searchName: string;
  type: CatalogItemType;
  partnerPrice: number;
  displayPrice: number;
  discountedPrice: number | null;
  description: string | null;
  parameters: string | null;
  sampleType: string | null;
  reportTime: string | null;
  partnerData?: any;
  detailsData?: {
    fastingAdvice?: string;
    sampleType?: string;
    reportTime?: string;
    parametersCount?: number;
    parametersList?: { name: string; description?: string }[];
    organGroups?: { name: string; icon?: string; tests: string[] }[];
  } | null;
  isEnabled: boolean;
  isFeatured: boolean;
  featuredOrder: number | null;
  categories?: {
    category: {
      id: string;
      name: string;
      slug: string;
    };
  }[];
}

export interface CatalogCategory {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  sortOrder: number;
}

export interface Patient extends PatientHealth {
  id: string;
  userId: string;
  name: string;
  relation: string;
  age: number;
  gender: string;
  dob?: string | null;
}

export interface CartPatientInfo {
  id: string;
  name: string;
  relation: string;
  age?: number;
  gender?: string;
}

export interface CartItem {
  id: string;
  cartId: string;
  testCode: string;
  testName: string;
  price: number;
  mrp?: number | null;
  patientId?: string | null;
  patient?: CartPatientInfo | null;
  isAvailable?: boolean;
  currentPrice?: number;
}

export interface Cart {
  id: string;
  userId: string;
  lastActivityAt: string;
  items: CartItem[];
}

export interface Address {
  id: string;
  userId: string;
  line1: string;
  city: string;
  pincode: string;
  lat?: string | null;
  long?: string | null;
  isDeleted: boolean;
}

export interface Slot {
  stm_id: string;
  slot_time: string;
  display_time: string;
  slot_date?: string;
  is_fasting?: boolean;
}

export interface PromoValidationResult {
  valid: boolean;
  discountAmount: number;
  finalAmount: number;
  promoCodeId?: string;
  code?: string;
  message?: string;
}

export interface AvailablePromo {
  id: string;
  code: string;
  discountType: 'PERCENTAGE' | 'FLAT';
  discountValue: number;
  maxDiscount: number | null;
  minOrderValue: number;
  description?: string;
}

export interface PreCheckoutValidation {
  valid: boolean;
  bookable: string[];
  unavailable: {
    testCode: string;
    testName: string;
  }[];
}

export interface InitiatePaymentParams {
  slot_id: string;
  slotLabel: string;
  slotDate: string;
  addressId: string;
  promoCode?: string;
  useWallet?: boolean;
  billingPatientId?: string;
}

export interface InitiatePaymentResult {
  bookingId: string;
  razorpayOrderId?: string;
  amount: number; // in paise
  currency: string;
  keyId?: string;
  status?: string;
}

export interface VerifyPaymentParams {
  bookingId: string;
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface BookingItemSummary {
  id: string;
  bookingId: string;
  patientId: string;
  testCode: string;
  testName: string;
  price: number;
  patient: Patient;
}

/** Family-intake fields on a patient profile (see Person in lib/consult/api). */
export interface PatientHealth {
  phone?: string | null;
  preferredLanguage?: 'hi' | 'en';
  bloodGroup?: string | null;
  allergies?: string[];
  chronicConditions?: string[];
  currentMedications?: string[];
}

export interface BookingReport {
  id: string;
  bookingId: string;
  vendorCustomerId: string;
  sourceUrl: string;
  storageKey?: string | null;
  fetchStatus: string;
  isFullReport: boolean;
  generatedAt: string;
}

/** GET /api/reports/:reportId — one report for the in-app viewer. */
export interface ReportDetail {
  id: string;
  bookingId: string;
  isFullReport: boolean;
  /** PENDING | STORED | FAILED. The download still works while PENDING: the server fetches on demand. */
  fetchStatus: string;
  verifiedAt: string | null;
  generatedAt: string;
  fileSize: number | null;
  /** Booking slot date, YYYY-MM-DD. */
  collectedOn: string;
  patientName: string | null;
  tests: string[];
  /** Opens /api/reports/public/:token without an Authorization header. Expires (72 h by default). */
  viewToken: string;
}

export interface TestBooking {
  id: string;
  userId: string;
  partnerBookingId?: string | null;
  partnerStatus?: string | null;
  status: string;
  slotDate: string;
  slotTime: string;
  partnerSlotId?: string | null;
  totalAmount: number;
  discountAmount: number;
  walletAmount: number;
  finalAmount: number;
  paymentStatus: string;
  paidAt?: string | null;
  addressLine?: string | null;
  addressCity?: string | null;
  addressPincode?: string | null;
  phleboName?: string | null;
  phleboPhone?: string | null;
  phleboTrackingUrl?: string | null;
  items: BookingItemSummary[];
  reports?: BookingReport[];
  createdAt: string;
}
