/** The two public enquiry routes, the same endpoints the website posts to. */
import { api } from '@/lib/api';

import { callbackBody, corporateBody, type CallbackForm, type CorporateForm } from './forms';

export const infoApi = {
  requestCallback: (form: CallbackForm) => api.post('/api/callback/request', callbackBody(form)).then((r) => r.data),
  corporateInquiry: (form: CorporateForm) => api.post('/api/corporate-inquiries', corporateBody(form)).then((r) => r.data),
};
