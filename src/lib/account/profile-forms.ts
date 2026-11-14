/** Edit-profile and change-password checks and body mapping. Pure, so the screens stay thin. */
import { isEmail, validateNewPassword } from './auth-forms';
import type { AccountProfile, ProfileUpdate } from './types';

export const PROFILE_GENDERS = ['Male', 'Female', 'Other'] as const;

export interface EditProfileForm {
    name: string;
    age: string;
    gender: string;
    email: string;
}

export function editProfileForm(profile?: AccountProfile | null): EditProfileForm {
    return {
        name: profile?.name ?? '',
        age: profile?.age ? String(profile.age) : '',
        gender: profile?.gender ?? '',
        email: profile?.email ?? '',
    };
}

/** The first problem with the form as plain text, or null when it can be saved. */
export function validateEditProfile(form: EditProfileForm): string | null {
    const name = form.name.trim();
    // The server's own rule, so checkout always has a usable name.
    if (name.length < 2 || name.length > 60 || /\d/.test(name)) {
        return 'Enter your name, 2 to 60 letters with no numbers';
    }
    if (form.age.trim()) {
        const age = Number(form.age.trim());
        if (!Number.isInteger(age) || age <= 0 || age > 120) return 'Please enter a valid age';
    }
    if (!form.gender) return 'Please select a gender';
    if (form.email.trim() && !isEmail(form.email)) return 'Please enter a valid email address';
    return null;
}

/** Only the fields the user filled in, so a blank age never clears a saved one. */
export function editProfileBody(form: EditProfileForm): ProfileUpdate {
    const body: ProfileUpdate = { name: form.name.trim(), gender: form.gender };
    if (form.age.trim()) body.age = parseInt(form.age.trim(), 10);
    const email = form.email.trim();
    if (email) body.email = email;
    return body;
}

/** True when nothing was touched, so Save can stay off instead of sending the same values. */
export function sameProfile(a: EditProfileForm, b: EditProfileForm): boolean {
    return (
        a.name.trim() === b.name.trim() &&
        a.age.trim() === b.age.trim() &&
        a.gender === b.gender &&
        a.email.trim() === b.email.trim()
    );
}

export interface PasswordForm {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}

export function validatePasswordChange(form: PasswordForm): string | null {
    if (!form.currentPassword) return 'Please enter your current password';
    const weak = validateNewPassword(form.newPassword);
    if (weak) return weak;
    if (form.newPassword !== form.confirmPassword) return 'The two new passwords do not match';
    if (form.newPassword === form.currentPassword) return 'Your new password must be different';
    return null;
}

/** "Asha Verma · 9876543210" for the header card, falling back to whatever is known. */
export function profileHeading(profile?: AccountProfile | null, fallbackName = 'DocNow user'): string {
    const name = profile?.name?.trim();
    return name || fallbackName;
}

export function profileDetailLine(profile?: AccountProfile | null): string {
    const parts = [profile?.age ? `${profile.age} years` : '', profile?.gender ?? '', profile?.email ?? ''];
    return parts.filter((part) => Boolean(part && part.trim())).join(' · ');
}
