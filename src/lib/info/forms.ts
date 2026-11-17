// Form checks mirrored from the server handlers (routes/callback.ts and routes/corporateInquiries.ts)
// so a request the server would reject never leaves the phone.
import { COMPANY_SIZE_OPTIONS, REQUIREMENT_TYPES } from './corporate';

export interface CallbackForm {
  name: string;
  mobile: string;
  city: string;
}

/** The website's callback dialog opens on Gurgaon. */
export const EMPTY_CALLBACK: CallbackForm = { name: '', mobile: '', city: 'Gurgaon' };

const MOBILE = /^[6-9]\d{9}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The server only insists on a name and a mobile, but a wrong number makes the callback useless. */
export function callbackError(form: CallbackForm): string | null {
  if (!form.name.trim()) return 'Please enter your name.';
  if (!MOBILE.test(form.mobile.trim())) return 'Please enter a valid 10-digit mobile number.';
  return null;
}

export function callbackBody(form: CallbackForm) {
  return { name: form.name.trim(), mobile: form.mobile.trim(), city: form.city };
}

export interface CorporateForm {
  contactName: string;
  workEmail: string;
  mobile: string;
  companyName: string;
  city: string;
  companySize: string;
  requirementType: string;
  summary: string;
}

export const EMPTY_CORPORATE: CorporateForm = {
  contactName: '',
  workEmail: '',
  mobile: '',
  companyName: '',
  city: '',
  companySize: '',
  requirementType: '',
  summary: '',
};

export function corporateError(form: CorporateForm): string | null {
  if (!form.contactName.trim()) return 'Contact person name is required.';
  if (!EMAIL.test(form.workEmail.trim())) return 'A valid work email is required.';
  if (!MOBILE.test(form.mobile.trim())) return 'A valid 10-digit mobile number is required.';
  if (!form.companyName.trim()) return 'Company name is required.';
  if (!form.city.trim()) return 'City is required.';
  if (!(COMPANY_SIZE_OPTIONS as readonly string[]).includes(form.companySize)) return 'Please select a company size.';
  if (!(REQUIREMENT_TYPES as readonly string[]).includes(form.requirementType)) {
    return 'Please select a requirement type.';
  }
  return null;
}

export function corporateBody(form: CorporateForm) {
  return {
    contactName: form.contactName.trim(),
    workEmail: form.workEmail.trim(),
    mobile: form.mobile.trim(),
    companyName: form.companyName.trim(),
    city: form.city.trim(),
    companySize: form.companySize,
    requirementType: form.requirementType,
    summary: form.summary.trim() || undefined,
  };
}
