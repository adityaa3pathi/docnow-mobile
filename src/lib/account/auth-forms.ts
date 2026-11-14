/** Sign-in, sign-up and reset form checks, with the same rules the website applies. All pure. */

export const OTP_LENGTH = 6;
/** The owner asked for a 10-second resend; the server still caps sends at 5 per 15 minutes. */
export const RESEND_SECONDS = 10;

/** The website's sign-up form offers these two, and the server also accepts Other. */
export const SIGNUP_GENDERS = ['Male', 'Female'] as const;

export const MOBILE_PROBLEM = 'Please enter a valid 10-digit mobile number';
export const OTP_PROBLEM = 'Please enter a valid 6-digit OTP';
export const PASSWORD_HINT = 'At least 6 characters with one letter and one number';

export function isMobile(value: string): boolean {
    return /^\d{10}$/.test(value.trim());
}

export function isOtp(value: string): boolean {
    return /^\d{6}$/.test(value.trim());
}

export function isEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/** Only digits, capped at the field's length, so the number pad cannot paste letters in. */
export function digitsOnly(value: string, max: number): string {
    return value.replace(/[^0-9]/g, '').slice(0, max);
}

/** The line every OTP step shows, because DocNow sends the code over WhatsApp. */
export function otpSentText(mobile: string): string {
    return `OTP sent on WhatsApp to ${mobile.trim()}`;
}

/** Counts the 10 seconds down, then reads as the button it becomes. */
export function resendLabel(seconds: number): string {
    return seconds > 0 ? `Resend in ${seconds}s` : 'Resend OTP';
}

export interface LoginPasswordForm {
    mobile: string;
    password: string;
}

export function validateLoginPassword(form: LoginPasswordForm): string | null {
    if (!isMobile(form.mobile)) return MOBILE_PROBLEM;
    if (!form.password) return 'Please enter your password';
    return null;
}

export interface SignupForm {
    name: string;
    age: string;
    gender: string;
    mobile: string;
    email: string;
    password: string;
    confirmPassword: string;
    referralCode: string;
    telemedicineConsent: boolean;
}

export const emptySignupForm = (): SignupForm => ({
    name: '',
    age: '',
    gender: '',
    mobile: '',
    email: '',
    password: '',
    confirmPassword: '',
    referralCode: '',
    telemedicineConsent: false,
});

/** The first problem with the sign-up form as plain text, or null when the OTP can be sent. */
export function validateSignup(form: SignupForm): string | null {
    const name = form.name.trim();
    if (!name) return 'Please enter your full name';
    if (/\d/.test(name)) return 'Your name cannot contain numbers';
    const age = Number(form.age.trim());
    if (!form.age.trim() || !Number.isInteger(age) || age <= 0 || age > 120) return 'Please enter a valid age';
    if (!form.gender) return 'Please select a gender';
    if (!isMobile(form.mobile)) return MOBILE_PROBLEM;
    if (form.email.trim() && !isEmail(form.email)) return 'Please enter a valid email address';
    if (form.password.length < 6) return 'Your password must be at least 6 characters';
    if (form.password !== form.confirmPassword) return 'The two passwords do not match';
    if (!form.telemedicineConsent) return 'Please tick the consent to create your account';
    return null;
}

export interface SignupBody {
    name: string;
    age: number;
    gender: string;
    mobile: string;
    email?: string;
    password: string;
    referralCode?: string;
    telemedicineConsent: boolean;
    code: string;
}

/** The sign-up form as the body /auth/signup/verify takes: age a number, blanks left out. */
export function signupBody(form: SignupForm, code: string): SignupBody {
    const email = form.email.trim();
    const referralCode = form.referralCode.trim().toUpperCase();
    return {
        name: form.name.trim(),
        age: parseInt(form.age.trim(), 10),
        gender: form.gender,
        mobile: form.mobile.trim(),
        ...(email ? { email } : {}),
        password: form.password,
        ...(referralCode ? { referralCode } : {}),
        telemedicineConsent: form.telemedicineConsent,
        code: code.trim(),
    };
}

/** The server's own rule for a new password: 6 or more, with a letter and a number. */
export function validateNewPassword(value: string): string | null {
    if (value.length < 6) return 'Your password must be at least 6 characters';
    if (!/[a-zA-Z]/.test(value) || !/\d/.test(value)) {
        return 'Your password must have at least one letter and one number';
    }
    return null;
}

export interface ForgotResetForm {
    otp: string;
    newPassword: string;
    confirmNewPassword: string;
}

export function validateForgotReset(form: ForgotResetForm): string | null {
    if (!isOtp(form.otp)) return 'Please enter a valid 6-digit code';
    const weak = validateNewPassword(form.newPassword);
    if (weak) return weak;
    if (form.newPassword !== form.confirmNewPassword) return 'The two passwords do not match';
    return null;
}
