import { describe, expect, it } from 'vitest';

import { COMPANY_SIZE_OPTIONS, REQUIREMENT_TYPES } from './corporate';
import {
  callbackBody,
  callbackError,
  corporateBody,
  corporateError,
  EMPTY_CALLBACK,
  EMPTY_CORPORATE,
  type CorporateForm,
} from './forms';

describe('callbackError', () => {
  it('accepts a name with a valid mobile number', () => {
    expect(callbackError({ name: 'Asha', mobile: '9876543210', city: 'Jaipur' })).toBeNull();
  });

  it('asks for a name first', () => {
    expect(callbackError({ ...EMPTY_CALLBACK, mobile: '9876543210' })).toBe('Please enter your name.');
    expect(callbackError({ name: '   ', mobile: '9876543210', city: 'Jaipur' })).toBe('Please enter your name.');
  });

  it('rejects a number the server would not call', () => {
    const bad = ['', '98765', '98765432100', '1234567890', '5876543210', 'abcdefghij'];
    for (const mobile of bad) {
      expect(callbackError({ name: 'Asha', mobile, city: 'Jaipur' }), mobile).toBe(
        'Please enter a valid 10-digit mobile number.',
      );
    }
  });

  it('opens on Gurgaon, as the website dialog does', () => {
    expect(EMPTY_CALLBACK.city).toBe('Gurgaon');
  });

  it('trims the name and number it sends', () => {
    expect(callbackBody({ name: ' Asha ', mobile: ' 9876543210 ', city: 'Jaipur' })).toEqual({
      name: 'Asha',
      mobile: '9876543210',
      city: 'Jaipur',
    });
  });
});

const valid: CorporateForm = {
  contactName: 'Asha Rao',
  workEmail: 'asha@acme.com',
  mobile: '9876543210',
  companyName: 'Acme Ltd',
  city: 'Jaipur',
  companySize: '51-200',
  requirementType: 'Onsite health camps',
  summary: '',
};

describe('corporateError', () => {
  it('accepts a complete enquiry', () => {
    expect(corporateError(valid)).toBeNull();
  });

  it('reports each missing field in the order the server checks them', () => {
    expect(corporateError({ ...valid, contactName: ' ' })).toBe('Contact person name is required.');
    expect(corporateError({ ...valid, workEmail: 'asha@acme' })).toBe('A valid work email is required.');
    expect(corporateError({ ...valid, mobile: '12345' })).toBe('A valid 10-digit mobile number is required.');
    expect(corporateError({ ...valid, companyName: '' })).toBe('Company name is required.');
    expect(corporateError({ ...valid, city: '' })).toBe('City is required.');
  });

  it('rejects a company size or requirement the server does not allow', () => {
    expect(corporateError({ ...valid, companySize: '2-10' })).toBe('Please select a company size.');
    expect(corporateError({ ...valid, requirementType: 'Something else' })).toBe('Please select a requirement type.');
    expect(corporateError(EMPTY_CORPORATE)).toBe('Contact person name is required.');
  });

  it('accepts every option the server lists', () => {
    for (const companySize of COMPANY_SIZE_OPTIONS) {
      expect(corporateError({ ...valid, companySize }), companySize).toBeNull();
    }
    for (const requirementType of REQUIREMENT_TYPES) {
      expect(corporateError({ ...valid, requirementType }), requirementType).toBeNull();
    }
  });
});

describe('corporateBody', () => {
  it('trims the text fields and leaves an empty summary out', () => {
    const body = corporateBody({ ...valid, contactName: ' Asha Rao ', summary: '   ' });
    expect(body.contactName).toBe('Asha Rao');
    expect(body.summary).toBeUndefined();
  });

  it('sends a summary when one was typed', () => {
    expect(corporateBody({ ...valid, summary: ' 400 staff, two sites ' }).summary).toBe('400 staff, two sites');
  });

  it('passes the chosen options through untouched, because the server matches them exactly', () => {
    const body = corporateBody(valid);
    expect(body.companySize).toBe('51-200');
    expect(body.requirementType).toBe('Onsite health camps');
  });
});
