import { describe, expect, it } from 'vitest';

import {
    digitsOnly,
    emptySignupForm,
    isEmail,
    isMobile,
    isOtp,
    MOBILE_PROBLEM,
    otpSentText,
    resendLabel,
    signupBody,
    validateForgotReset,
    validateLoginPassword,
    validateNewPassword,
    validateSignup,
} from './auth-forms';

describe('field checks', () => {
    it('takes a 10-digit mobile number only', () => {
        expect(isMobile('9876543210')).toBe(true);
        expect(isMobile(' 9876543210 ')).toBe(true);
        expect(isMobile('98765432')).toBe(false);
        expect(isMobile('98765432101')).toBe(false);
        expect(isMobile('98765432a0')).toBe(false);
    });

    it('takes a 6-digit OTP only', () => {
        expect(isOtp('123456')).toBe(true);
        expect(isOtp('12345')).toBe(false);
        expect(isOtp('12345x')).toBe(false);
    });

    it('recognises a plain email address', () => {
        expect(isEmail('asha@example.com')).toBe(true);
        expect(isEmail('asha@example')).toBe(false);
        expect(isEmail('asha example.com')).toBe(false);
    });

    it('keeps digits only, up to the field length', () => {
        expect(digitsOnly('98a7-65 4321099', 10)).toBe('9876543210');
        expect(digitsOnly('12 34 56', 6)).toBe('123456');
    });
});

describe('OTP wording', () => {
    it('says the code went to WhatsApp', () => {
        expect(otpSentText(' 9876543210 ')).toBe('OTP sent on WhatsApp to 9876543210');
    });

    it('counts the 10 seconds down, then offers the resend', () => {
        expect(resendLabel(10)).toBe('Resend in 10s');
        expect(resendLabel(1)).toBe('Resend in 1s');
        expect(resendLabel(0)).toBe('Resend OTP');
    });
});

describe('validateLoginPassword', () => {
    it('needs a valid number and some password', () => {
        expect(validateLoginPassword({ mobile: '9876543210', password: 'secret1' })).toBeNull();
        expect(validateLoginPassword({ mobile: '12345', password: 'secret1' })).toBe(MOBILE_PROBLEM);
        expect(validateLoginPassword({ mobile: '9876543210', password: '' })).toBe('Please enter your password');
    });
});

describe('validateSignup', () => {
    const ok = {
        ...emptySignupForm(),
        name: 'Asha Verma',
        age: '34',
        gender: 'Female',
        mobile: '9876543210',
        password: 'secret1',
        confirmPassword: 'secret1',
        telemedicineConsent: true,
    };

    it('accepts a complete form', () => expect(validateSignup(ok)).toBeNull());

    it('accepts a blank email and a blank referral code', () => {
        expect(validateSignup({ ...ok, email: '', referralCode: '' })).toBeNull();
    });

    it('reports the first problem it finds', () => {
        expect(validateSignup({ ...ok, name: '  ' })).toBe('Please enter your full name');
        expect(validateSignup({ ...ok, name: 'Asha 2' })).toBe('Your name cannot contain numbers');
        expect(validateSignup({ ...ok, age: '' })).toBe('Please enter a valid age');
        expect(validateSignup({ ...ok, age: '0' })).toBe('Please enter a valid age');
        expect(validateSignup({ ...ok, age: '121' })).toBe('Please enter a valid age');
        expect(validateSignup({ ...ok, age: '34.5' })).toBe('Please enter a valid age');
        expect(validateSignup({ ...ok, gender: '' })).toBe('Please select a gender');
        expect(validateSignup({ ...ok, mobile: '98765' })).toBe(MOBILE_PROBLEM);
        expect(validateSignup({ ...ok, email: 'nope' })).toBe('Please enter a valid email address');
        expect(validateSignup({ ...ok, password: 'abc', confirmPassword: 'abc' })).toBe(
            'Your password must be at least 6 characters',
        );
        expect(validateSignup({ ...ok, confirmPassword: 'secret2' })).toBe('The two passwords do not match');
        expect(validateSignup({ ...ok, telemedicineConsent: false })).toBe(
            'Please tick the consent to create your account',
        );
    });
});

describe('signupBody', () => {
    const form = {
        ...emptySignupForm(),
        name: '  Asha Verma ',
        age: ' 34 ',
        gender: 'Female',
        mobile: ' 9876543210 ',
        password: 'secret1',
        confirmPassword: 'secret1',
        telemedicineConsent: true,
    };

    it('sends a numeric age, trimmed text and an upper-case referral code', () => {
        expect(signupBody({ ...form, email: ' asha@example.com ', referralCode: ' asha12 ' }, ' 123456 ')).toEqual({
            name: 'Asha Verma',
            age: 34,
            gender: 'Female',
            mobile: '9876543210',
            email: 'asha@example.com',
            password: 'secret1',
            referralCode: 'ASHA12',
            telemedicineConsent: true,
            code: '123456',
        });
    });

    it('leaves out a blank email and a blank referral code', () => {
        const body = signupBody(form, '123456');
        expect('email' in body).toBe(false);
        expect('referralCode' in body).toBe(false);
    });
});

describe('validateNewPassword', () => {
    it('asks for 6 characters with a letter and a number', () => {
        expect(validateNewPassword('secret1')).toBeNull();
        expect(validateNewPassword('sec1')).toBe('Your password must be at least 6 characters');
        expect(validateNewPassword('secrets')).toBe('Your password must have at least one letter and one number');
        expect(validateNewPassword('1234567')).toBe('Your password must have at least one letter and one number');
    });
});

describe('validateForgotReset', () => {
    const ok = { otp: '123456', newPassword: 'secret1', confirmNewPassword: 'secret1' };
    it('accepts a complete reset', () => expect(validateForgotReset(ok)).toBeNull());
    it('checks the code, then the password, then the repeat', () => {
        expect(validateForgotReset({ ...ok, otp: '123' })).toBe('Please enter a valid 6-digit code');
        expect(validateForgotReset({ ...ok, newPassword: 'abc', confirmNewPassword: 'abc' })).toBe(
            'Your password must be at least 6 characters',
        );
        expect(validateForgotReset({ ...ok, confirmNewPassword: 'secret2' })).toBe('The two passwords do not match');
    });
});
