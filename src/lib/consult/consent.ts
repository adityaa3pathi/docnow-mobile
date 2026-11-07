/**
 * Telemedicine consent (NMC Telemedicine Practice Guidelines, 2020). The server refuses a patient-side
 * join without it. Keep CONSENT_VERSION and the wording identical to the website's consent.ts.
 */
export const CONSENT_VERSION = 'nmc-tpg-2020-v1';

export const consentText = (doctorName: string) => {
  const dr = doctorName.startsWith('Dr') ? doctorName : `Dr. ${doctorName}`;
  return `I consent to an online telemedicine video consultation with ${dr} in accordance with the National Medical Commission (NMC) Telemedicine Practice Guidelines.`;
};

export const CONSENT_REQUIRED_HINT = 'Please accept teleconsultation consent to join';
