import { api } from '@/lib/api';
import type {
  Address,
  AvailablePromo,
  BookingReport,
  Cart,
  CatalogCategory,
  CatalogItem,
  InitiatePaymentParams,
  InitiatePaymentResult,
  Patient,
  PreCheckoutValidation,
  PromoValidationResult,
  ReportDetail,
  Slot,
  TestBooking,
  VerifyPaymentParams,
} from './types';

export const SAMPLE_COLLECTION_FEE = 129;
export const SAMPLE_COLLECTION_FEE_THRESHOLD = 500;

export function calculateCollectionFee(subtotal: number): number {
  if (subtotal <= 0) return 0;
  return subtotal < SAMPLE_COLLECTION_FEE_THRESHOLD ? SAMPLE_COLLECTION_FEE : 0;
}

export const catalogApi = {
  products: async (params?: {
    type?: string;
    search?: string;
    category?: string;
    zipcode?: string;
    page?: number;
    limit?: number;
  }): Promise<{ products: CatalogItem[]; totalCount: number; page: number; limit: number; totalPages: number }> => {
    const { data } = await api.get('/api/catalog/products', { params });
    return data;
  },

  featured: async (params?: { type?: string; limit?: number }): Promise<{ products: CatalogItem[] }> => {
    const { data } = await api.get('/api/catalog/featured', { params });
    return data;
  },

  detail: async (code: string): Promise<CatalogItem> => {
    const { data } = await api.get(`/api/catalog/products/${code}`);
    return data;
  },

  parameters: async (dealType: string, dealTypeId: string | number): Promise<any> => {
    const { data } = await api.get(`/api/catalog/product-details/${dealType}/${dealTypeId}`);
    return data;
  },

  categories: async (): Promise<CatalogCategory[]> => {
    const { data } = await api.get('/api/catalog/categories');
    return data;
  },
};

export const locationApi = {
  serviceability: async (params: { lat?: number | string; long?: number | string; zipcode: string }): Promise<any> => {
    const { data } = await api.get('/api/location/serviceability', { params });
    return data;
  },

  geocode: async (pincode: string): Promise<{ lat: string; long: string; city: string; state: string }> => {
    const { data } = await api.get('/api/location/geocode', { params: { pincode } });
    return data;
  },
};

export const cartApi = {
  get: async (): Promise<Cart> => {
    const { data } = await api.get('/api/cart');
    return data;
  },

  addItem: async (testCode: string, patientId?: string): Promise<Cart> => {
    await api.post('/api/cart/items', { testCode, patientId });
    return cartApi.get();
  },

  assignPatient: async (itemId: string, patientId: string | null): Promise<Cart> => {
    await api.put(`/api/cart/items/${itemId}`, { patientId });
    return cartApi.get();
  },

  removeItem: async (itemId: string): Promise<Cart> => {
    await api.delete(`/api/cart/items/${itemId}`);
    return cartApi.get();
  },

  clear: async (): Promise<void> => {
    await api.delete('/api/cart');
  },
};

export const slotsApi = {
  list: async (params: {
    lat?: string | number;
    long?: string | number;
    zipcode: string;
    date: string; // YYYY-MM-DD
  }): Promise<{ slots: Slot[]; zone_id?: string }> => {
    const { data } = await api.get('/api/slots', { params });
    const slotsArray = Array.isArray(data)
      ? data
      : Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data?.slots)
      ? data.slots
      : [];
    return {
      slots: slotsArray,
      zone_id: data?.zone_id || data?.data?.zone_id,
    };
  },

  freeze: async (slotId: string): Promise<{ success: boolean; message?: string }> => {
    const { data } = await api.post('/api/slots/freeze', { slot_id: slotId });
    return data;
  },
};

export const patientsApi = {
  list: async (): Promise<Patient[]> => {
    const { data } = await api.get('/api/profile/patients');
    return data;
  },

  ensureSelf: async (): Promise<Patient> => {
    const { data } = await api.post('/api/profile/patients/ensure-self');
    return data;
  },

  add: async (params: {
    name: string;
    relation: string;
    age: number;
    gender: string;
    dob?: string;
  }): Promise<Patient> => {
    const { data } = await api.post('/api/profile/patients', params);
    return data;
  },

  update: async (
    id: string,
    params: { name?: string; relation?: string; age?: number; gender?: string; dob?: string },
  ): Promise<Patient> => {
    const { data } = await api.put(`/api/profile/patients/${id}`, params);
    return data;
  },

  delete: async (id: string): Promise<{ success: boolean }> => {
    const { data } = await api.delete(`/api/profile/patients/${id}`);
    return data;
  },
};

export const addressesApi = {
  list: async (): Promise<Address[]> => {
    const { data } = await api.get('/api/profile/addresses');
    return data;
  },

  add: async (params: {
    line1: string;
    city: string;
    pincode: string;
    lat?: string;
    long?: string;
  }): Promise<Address> => {
    const { data } = await api.post('/api/profile/addresses', params);
    return data;
  },

  update: async (
    id: string,
    params: { line1: string; city: string; pincode: string; lat?: string; long?: string },
  ): Promise<Address> => {
    const { data } = await api.put(`/api/profile/addresses/${id}`, params);
    return data;
  },

  delete: async (id: string): Promise<{ success: boolean }> => {
    const { data } = await api.delete(`/api/profile/addresses/${id}`);
    return data;
  },

  patchCoords: async (id: string, lat: string | number, long: string | number): Promise<void> => {
    await api.patch(`/api/profile/addresses/${id}/coords`, { lat: String(lat), long: String(long) });
  },
};

export const promosApi = {
  available: async (): Promise<AvailablePromo[]> => {
    const { data } = await api.get('/api/promos/available');
    return data;
  },

  validate: async (code: string, cartAmount: number): Promise<PromoValidationResult> => {
    const { data } = await api.post('/api/promos/validate', { code, cartAmount });
    return data;
  },
};

export const paymentsApi = {
  validate: async (params: {
    cartId: string;
    zipcode: string;
    lat?: string | number;
    long?: string | number;
    date?: string;
  }): Promise<PreCheckoutValidation> => {
    const { data } = await api.post('/api/payments/validate', params);
    return data;
  },

  initiate: async (params: InitiatePaymentParams): Promise<InitiatePaymentResult> => {
    const { data } = await api.post('/api/payments/initiate', params);
    return data;
  },

  verify: async (params: VerifyPaymentParams): Promise<{ success: boolean; bookingId: string; status: string }> => {
    const { data } = await api.post('/api/payments/verify', params);
    return data;
  },
};

export const bookingsApi = {
  list: async (): Promise<TestBooking[]> => {
    const { data } = await api.get('/api/bookings');
    return data;
  },

  status: async (id: string): Promise<TestBooking> => {
    const { data } = await api.get(`/api/bookings/${id}/status`);
    return data;
  },

  cancel: async (id: string, remarks: string): Promise<{ success: boolean; message: string }> => {
    const { data } = await api.post(`/api/bookings/${id}/cancel`, { remarks });
    return data;
  },

  reschedulableSlots: async (id: string, date: string): Promise<{ slots: Slot[] }> => {
    const { data } = await api.get(`/api/bookings/${id}/reschedulable-slots`, { params: { date } });
    return data;
  },

  reschedule: async (
    id: string,
    params: { slot_id: string; slotDate: string; slotTime: string; reschedule_reason: string },
  ): Promise<{ success: boolean; newBookingId: string }> => {
    const { data } = await api.post(`/api/bookings/${id}/reschedule`, params);
    return data;
  },

  phleboContact: async (id: string): Promise<{ name?: string; phone?: string; trackingUrl?: string }> => {
    const { data } = await api.get(`/api/bookings/${id}/phlebo-contact`);
    return data;
  },
};

export const reportsApi = {
  forBooking: async (bookingId: string): Promise<BookingReport[]> => {
    const { data } = await api.get(`/api/reports/booking/${bookingId}`);
    return data;
  },

  downloadUrl: (reportId: string): string => {
    return `${process.env.EXPO_PUBLIC_API_URL || ''}/api/reports/${reportId}/download`;
  },

  detail: async (reportId: string): Promise<ReportDetail> => {
    const { data } = await api.get(`/api/reports/${reportId}`, { timeout: 10_000 });
    return data;
  },

  /** A link that opens the PDF without sign-in headers, for the in-app browser and downloads. */
  publicUrl: (viewToken: string): string => {
    return `${process.env.EXPO_PUBLIC_API_URL || ''}/api/reports/public/${viewToken}`;
  },
};

export const invoicesApi = {
  downloadUrl: (bookingId: string): string => {
    return `${process.env.EXPO_PUBLIC_API_URL || ''}/api/invoices/booking/${bookingId}/download`;
  },
};
