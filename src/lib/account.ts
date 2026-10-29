/** Copy for the in-app account deletion (App Store 5.1.1(v)); the server side is DELETE /api/profile. */
export const DELETE_ACCOUNT_TITLE = 'Delete Account?';
/**
 * Prescriptions, consultation notes and invoices must be kept by law (NMC telemedicine rules, tax
 * law), so the copy says they stay, without contact details, rather than promising they vanish.
 */
export const DELETE_ACCOUNT_MESSAGE =
  'This action is permanent. Your account, saved family profiles and addresses will be removed, and you will lose access to your medical records and past consultations. Records the law requires us to keep, such as prescriptions and invoices, are kept without your contact details.';
