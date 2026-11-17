import { describe, expect, it } from 'vitest';

import {
    editProfileBody,
    editProfileForm,
    profileDetailLine,
    profileHeading,
    sameProfile,
    validateEditProfile,
    validatePasswordChange,
} from './profile-forms';

const profile = {
    id: 'u1',
    name: 'Asha Verma',
    email: 'asha@example.com',
    mobile: '9876543210',
    isVerified: true,
    gender: 'Female',
    age: 34,
};

describe('editProfileForm', () => {
    it('fills the form from the saved profile', () => {
        expect(editProfileForm(profile)).toEqual({
            name: 'Asha Verma',
            age: '34',
            gender: 'Female',
            email: 'asha@example.com',
        });
    });

    it('starts blank when there is no profile yet', () => {
        expect(editProfileForm(null)).toEqual({ name: '', age: '', gender: '', email: '' });
    });
});

describe('validateEditProfile', () => {
    const ok = { name: 'Asha Verma', age: '34', gender: 'Female', email: 'asha@example.com' };
    it('accepts a complete form and a blank email or age', () => {
        expect(validateEditProfile(ok)).toBeNull();
        expect(validateEditProfile({ ...ok, email: '', age: '' })).toBeNull();
    });

    it('applies the server name rule', () => {
        const problem = 'Enter your name, 2 to 60 letters with no numbers';
        expect(validateEditProfile({ ...ok, name: 'A' })).toBe(problem);
        expect(validateEditProfile({ ...ok, name: 'Asha 2' })).toBe(problem);
        expect(validateEditProfile({ ...ok, name: 'a'.repeat(61) })).toBe(problem);
    });

    it('checks the age, the gender and the email', () => {
        expect(validateEditProfile({ ...ok, age: '0' })).toBe('Please enter a valid age');
        expect(validateEditProfile({ ...ok, age: '130' })).toBe('Please enter a valid age');
        expect(validateEditProfile({ ...ok, gender: '' })).toBe('Please select a gender');
        expect(validateEditProfile({ ...ok, email: 'nope' })).toBe('Please enter a valid email address');
    });
});

describe('editProfileBody', () => {
    it('trims the text and sends the age as a number', () => {
        expect(editProfileBody({ name: ' Asha ', age: ' 34 ', gender: 'Female', email: ' a@b.com ' })).toEqual({
            name: 'Asha',
            gender: 'Female',
            age: 34,
            email: 'a@b.com',
        });
    });

    it('leaves out a blank age and a blank email instead of clearing them', () => {
        expect(editProfileBody({ name: 'Asha', age: '', gender: 'Other', email: '' })).toEqual({
            name: 'Asha',
            gender: 'Other',
        });
    });
});

describe('sameProfile', () => {
    const form = { name: 'Asha', age: '34', gender: 'Female', email: 'a@b.com' };
    it('ignores whitespace when nothing really changed', () => {
        expect(sameProfile(form, { ...form, name: ' Asha ' })).toBe(true);
        expect(sameProfile(form, { ...form, age: '35' })).toBe(false);
    });
});

describe('validatePasswordChange', () => {
    const ok = { currentPassword: 'old1pass', newPassword: 'secret1', confirmPassword: 'secret1' };
    it('accepts a complete change', () => expect(validatePasswordChange(ok)).toBeNull());
    it('reports the first problem it finds', () => {
        expect(validatePasswordChange({ ...ok, currentPassword: '' })).toBe('Please enter your current password');
        expect(validatePasswordChange({ ...ok, newPassword: 'abcdefg', confirmPassword: 'abcdefg' })).toBe(
            'Your password must have at least one letter and one number',
        );
        expect(validatePasswordChange({ ...ok, confirmPassword: 'secret2' })).toBe(
            'The two new passwords do not match',
        );
        expect(validatePasswordChange({ currentPassword: 'secret1', newPassword: 'secret1', confirmPassword: 'secret1' })).toBe(
            'Your new password must be different',
        );
    });
});

describe('header text', () => {
    it('falls back when the account has no name yet', () => {
        expect(profileHeading(profile)).toBe('Asha Verma');
        expect(profileHeading({ ...profile, name: '  ' })).toBe('DocNow user');
        expect(profileHeading(null)).toBe('DocNow user');
    });

    it('joins only the details the server knows', () => {
        expect(profileDetailLine(profile)).toBe('34 years · Female · asha@example.com');
        expect(profileDetailLine({ ...profile, age: null, email: null })).toBe('Female');
        expect(profileDetailLine(null)).toBe('');
    });
});
