import { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConsentCheck } from '@/components/account/consent-check';
import { ResendOtp } from '@/components/account/resend-otp';
import { ChipGroup, Field, PasswordField } from '@/components/account/ui';
import { ActionButton, Notice } from '@/components/doctor/ui';
import { Colors, Fonts, Radius, Space, Type } from '@/constants/theme';
import { useResendTimer } from '@/hooks/use-resend-timer';
import {
  digitsOnly,
  emptySignupForm,
  isMobile,
  isOtp,
  MOBILE_PROBLEM,
  OTP_LENGTH,
  OTP_PROBLEM,
  otpSentText,
  PASSWORD_HINT,
  signupBody,
  SIGNUP_GENDERS,
  validateForgotReset,
  validateLoginPassword,
  validateSignup,
  type SignupForm,
} from '@/lib/account/auth-forms';
import { useAuth } from '@/lib/auth';
import { friendlyError } from '@/lib/consult/api';
import { SIGNUP_CONSENT_TEXT } from '@/lib/consult/consent';

const MOBILE_LABEL = 'Enter your WhatsApp number';
const SIGNUP_MOBILE_LABEL = 'WhatsApp mobile number';

type Screen = 'login' | 'signup' | 'forgot';
type LoginMethod = 'password' | 'otp';

export default function Login() {
  const auth = useAuth();
  const resend = useResendTimer();

  const [screen, setScreen] = useState<Screen>('login');
  const [method, setMethod] = useState<LoginMethod>('password');
  const [loginStep, setLoginStep] = useState<'input' | 'otp'>('input');
  const [signupStep, setSignupStep] = useState<'details' | 'otp'>('details');
  const [forgotStep, setForgotStep] = useState<'mobile' | 'reset' | 'done'>('mobile');

  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [signup, setSignup] = useState<SignupForm>(emptySignupForm);
  const [reset, setReset] = useState({ otp: '', newPassword: '', confirmNewPassword: '' });

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const field = <K extends keyof SignupForm>(key: K) => (value: SignupForm[K]) =>
    setSignup((form) => ({ ...form, [key]: value }));

  /** One place for every call, so a server message always reaches the person who tapped. */
  const run = useCallback(async (work: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await work();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }, []);

  const goTo = (next: Screen) => {
    setScreen(next);
    setError('');
    setCode('');
    setLoginStep('input');
    setSignupStep('details');
    setForgotStep('mobile');
  };

  // --- Log in ---

  const loginByPassword = () =>
    run(async () => {
      const problem = validateLoginPassword({ mobile, password });
      if (problem) {
        setError(problem);
        return;
      }
      await auth.loginWithPassword(mobile.trim(), password);
    });

  const sendLoginOtp = () =>
    run(async () => {
      if (!isMobile(mobile)) {
        setError(MOBILE_PROBLEM);
        return;
      }
      await auth.sendOtp(mobile.trim());
      setLoginStep('otp');
      resend.start();
    });

  const verifyLoginOtp = () =>
    run(async () => {
      if (!isOtp(code)) {
        setError(OTP_PROBLEM);
        return;
      }
      await auth.verifyOtp(mobile.trim(), code.trim());
    });

  // --- Sign up ---

  const sendSignupOtp = () =>
    run(async () => {
      const problem = validateSignup(signup);
      if (problem) {
        setError(problem);
        return;
      }
      await auth.sendSignupOtp(signup.mobile.trim(), signup.email.trim() || undefined);
      setSignupStep('otp');
      resend.start();
    });

  const createAccount = () =>
    run(async () => {
      if (!isOtp(code)) {
        setError(OTP_PROBLEM);
        return;
      }
      await auth.signUp(signupBody(signup, code));
    });

  // --- Forgot password ---

  const sendResetOtp = () =>
    run(async () => {
      if (!isMobile(mobile)) {
        setError(MOBILE_PROBLEM);
        return;
      }
      await auth.sendResetOtp(mobile.trim());
      setForgotStep('reset');
      resend.start();
    });

  const resetPassword = () =>
    run(async () => {
      const problem = validateForgotReset(reset);
      if (problem) {
        setError(problem);
        return;
      }
      await auth.resetPassword(mobile.trim(), reset.otp.trim(), reset.newPassword);
      setReset({ otp: '', newPassword: '', confirmNewPassword: '' });
      setForgotStep('done');
    });

  const resendFor = (send: () => Promise<void>) => () => {
    if (resend.seconds > 0) return;
    void run(async () => {
      await send();
      resend.start();
    });
  };

  const title =
    screen === 'login' ? 'Welcome back' : screen === 'signup' ? 'Create your account' : 'Reset your password';

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Text style={styles.brand}>DocNow</Text>
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>

          {error ? <Notice tone="error">{error}</Notice> : null}

          {screen === 'login' ? (
            <View style={styles.form}>
              <View style={styles.tabs} accessibilityRole="tablist">
                {(['password', 'otp'] as const).map((option) => {
                  const active = method === option;
                  const label = option === 'password' ? 'Password' : 'OTP';
                  return (
                    <Pressable
                      key={option}
                      onPress={() => {
                        setMethod(option);
                        setLoginStep('input');
                        setError('');
                      }}
                      accessibilityRole="tab"
                      accessibilityLabel={`Log in with ${label === 'OTP' ? 'an OTP' : 'a password'}`}
                      accessibilityState={{ selected: active }}
                      style={[styles.tab, active && styles.tabOn]}>
                      <Text style={[styles.tabText, active && styles.tabTextOn]}>{label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {method === 'password' ? (
                <>
                  <Field
                    label={MOBILE_LABEL}
                    value={mobile}
                    onChangeText={(text) => setMobile(digitsOnly(text, 10))}
                    keyboardType="number-pad"
                    maxLength={10}
                    placeholder="10-digit WhatsApp number"
                    textContentType="telephoneNumber"
                  />
                  <PasswordField
                    label="Password"
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Your password"
                    textContentType="password"
                  />
                  <Pressable
                    onPress={() => goTo('forgot')}
                    accessibilityRole="button"
                    accessibilityLabel="Forgot your password"
                    style={styles.linkRow}>
                    <Text style={styles.link}>Forgot your password?</Text>
                  </Pressable>
                  <ActionButton label="Log in" busyLabel="Logging in..." busy={busy} onPress={loginByPassword} />
                </>
              ) : loginStep === 'input' ? (
                <>
                  <Field
                    label={MOBILE_LABEL}
                    value={mobile}
                    onChangeText={(text) => setMobile(digitsOnly(text, 10))}
                    keyboardType="number-pad"
                    maxLength={10}
                    placeholder="10-digit WhatsApp number"
                    textContentType="telephoneNumber"
                  />
                  <ActionButton label="Get OTP" busyLabel="Sending..." busy={busy} onPress={sendLoginOtp} />
                </>
              ) : (
                <>
                  <Text style={styles.sent} accessibilityLiveRegion="polite">
                    {otpSentText(mobile)}
                  </Text>
                  <Field
                    label="Enter the 6-digit OTP"
                    value={code}
                    onChangeText={(text) => setCode(digitsOnly(text, OTP_LENGTH))}
                    keyboardType="number-pad"
                    maxLength={OTP_LENGTH}
                    placeholder="6-digit OTP"
                    autoFocus
                    textContentType="oneTimeCode"
                  />
                  <ResendOtp seconds={resend.seconds} onResend={resendFor(() => auth.sendOtp(mobile.trim()))} />
                  <ActionButton
                    label="Verify and log in"
                    busyLabel="Checking..."
                    busy={busy}
                    onPress={verifyLoginOtp}
                  />
                  <Pressable
                    onPress={() => {
                      setLoginStep('input');
                      setCode('');
                      setError('');
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Change the number"
                    style={styles.linkRow}>
                    <Text style={styles.link}>Change the number</Text>
                  </Pressable>
                </>
              )}

              <Pressable
                onPress={() => goTo('signup')}
                accessibilityRole="button"
                accessibilityLabel="New to DocNow, create an account"
                style={styles.linkRow}>
                <Text style={styles.footer}>
                  New to DocNow? <Text style={styles.link}>Create an account</Text>
                </Text>
              </Pressable>
            </View>
          ) : null}

          {screen === 'signup' && signupStep === 'details' ? (
            <View style={styles.form}>
              <Field
                label="Full name"
                value={signup.name}
                onChangeText={field('name')}
                placeholder="Your name as on your records"
                autoCapitalize="words"
                textContentType="name"
              />
              <Field
                label="Age"
                value={signup.age}
                onChangeText={(text) => field('age')(digitsOnly(text, 3))}
                keyboardType="number-pad"
                maxLength={3}
                placeholder="Age in years"
              />
              <ChipGroup label="Gender" options={SIGNUP_GENDERS} value={signup.gender} onChange={field('gender')} />
              <Field
                label={SIGNUP_MOBILE_LABEL}
                value={signup.mobile}
                onChangeText={(text) => field('mobile')(digitsOnly(text, 10))}
                keyboardType="number-pad"
                maxLength={10}
                placeholder="10-digit WhatsApp number"
                hint="DocNow sends your OTP and booking updates on WhatsApp"
                textContentType="telephoneNumber"
              />
              <Field
                label="Email address (optional)"
                value={signup.email}
                onChangeText={field('email')}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="you@example.com"
                textContentType="emailAddress"
              />
              <PasswordField
                label="Password"
                value={signup.password}
                onChangeText={field('password')}
                placeholder="At least 6 characters"
                textContentType="newPassword"
              />
              <PasswordField
                label="Confirm password"
                value={signup.confirmPassword}
                onChangeText={field('confirmPassword')}
                placeholder="Type the password again"
                textContentType="newPassword"
              />
              <Field
                label="Referral code (optional)"
                value={signup.referralCode}
                onChangeText={(text) => field('referralCode')(text.toUpperCase())}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={12}
                placeholder="Your friend's code"
              />
              <ConsentCheck
                checked={signup.telemedicineConsent}
                onChange={field('telemedicineConsent')}
                label={SIGNUP_CONSENT_TEXT}
              />
              <ActionButton label="Send OTP" busyLabel="Sending..." busy={busy} onPress={sendSignupOtp} />
              <Pressable
                onPress={() => goTo('login')}
                accessibilityRole="button"
                accessibilityLabel="Already have an account, log in"
                style={styles.linkRow}>
                <Text style={styles.footer}>
                  Already have an account? <Text style={styles.link}>Log in</Text>
                </Text>
              </Pressable>
            </View>
          ) : null}

          {screen === 'signup' && signupStep === 'otp' ? (
            <View style={styles.form}>
              <Text style={styles.sent} accessibilityLiveRegion="polite">
                {otpSentText(signup.mobile)}
              </Text>
              <Field
                label="Enter the 6-digit OTP"
                value={code}
                onChangeText={(text) => setCode(digitsOnly(text, OTP_LENGTH))}
                keyboardType="number-pad"
                maxLength={OTP_LENGTH}
                placeholder="6-digit OTP"
                autoFocus
                textContentType="oneTimeCode"
              />
              <ResendOtp
                seconds={resend.seconds}
                onResend={resendFor(() =>
                  auth.sendSignupOtp(signup.mobile.trim(), signup.email.trim() || undefined),
                )}
              />
              <ActionButton
                label="Verify and create account"
                busyLabel="Creating..."
                busy={busy}
                onPress={createAccount}
              />
              <Pressable
                onPress={() => {
                  setSignupStep('details');
                  setCode('');
                  setError('');
                }}
                accessibilityRole="button"
                accessibilityLabel="Change your details"
                style={styles.linkRow}>
                <Text style={styles.link}>Change your details</Text>
              </Pressable>
            </View>
          ) : null}

          {screen === 'forgot' && forgotStep === 'mobile' ? (
            <View style={styles.form}>
              <Text style={styles.sent}>Enter your registered number and we will send a reset code.</Text>
              <Field
                label={MOBILE_LABEL}
                value={mobile}
                onChangeText={(text) => setMobile(digitsOnly(text, 10))}
                keyboardType="number-pad"
                maxLength={10}
                placeholder="10-digit WhatsApp number"
                textContentType="telephoneNumber"
              />
              <ActionButton label="Send reset code" busyLabel="Sending..." busy={busy} onPress={sendResetOtp} />
              <Pressable
                onPress={() => goTo('login')}
                accessibilityRole="button"
                accessibilityLabel="Back to log in"
                style={styles.linkRow}>
                <Text style={styles.link}>Back to log in</Text>
              </Pressable>
            </View>
          ) : null}

          {screen === 'forgot' && forgotStep === 'reset' ? (
            <View style={styles.form}>
              <Text style={styles.sent} accessibilityLiveRegion="polite">
                {otpSentText(mobile)}
              </Text>
              <Field
                label="Enter the 6-digit code"
                value={reset.otp}
                onChangeText={(text) => setReset((form) => ({ ...form, otp: digitsOnly(text, OTP_LENGTH) }))}
                keyboardType="number-pad"
                maxLength={OTP_LENGTH}
                placeholder="6-digit code"
                autoFocus
                textContentType="oneTimeCode"
              />
              <ResendOtp seconds={resend.seconds} onResend={resendFor(() => auth.sendResetOtp(mobile.trim()))} />
              <PasswordField
                label="New password"
                value={reset.newPassword}
                onChangeText={(text) => setReset((form) => ({ ...form, newPassword: text }))}
                placeholder="New password"
                hint={PASSWORD_HINT}
                textContentType="newPassword"
              />
              <PasswordField
                label="Confirm new password"
                value={reset.confirmNewPassword}
                onChangeText={(text) => setReset((form) => ({ ...form, confirmNewPassword: text }))}
                placeholder="Type the new password again"
                textContentType="newPassword"
              />
              <ActionButton label="Reset password" busyLabel="Saving..." busy={busy} onPress={resetPassword} />
              <Pressable
                onPress={() => goTo('login')}
                accessibilityRole="button"
                accessibilityLabel="Back to log in"
                style={styles.linkRow}>
                <Text style={styles.link}>Back to log in</Text>
              </Pressable>
            </View>
          ) : null}

          {screen === 'forgot' && forgotStep === 'done' ? (
            <View style={styles.form}>
              <Notice tone="success">Your password has been changed. You can log in with it now.</Notice>
              <ActionButton
                label="Go to log in"
                onPress={() => {
                  setMethod('password');
                  setPassword('');
                  goTo('login');
                }}
              />
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  flex: { flex: 1 },
  body: { padding: Space[6], gap: Space[2], flexGrow: 1, justifyContent: 'center' },
  brand: { ...Type.titleLg, fontFamily: Fonts.bold, color: Colors.primary },
  title: { ...Type.titleSm, color: Colors.ink, marginBottom: Space[2] },
  form: { gap: Space[3], marginTop: Space[2] },
  tabs: {
    flexDirection: 'row',
    gap: Space[1],
    padding: Space[1],
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceMuted,
  },
  tab: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.sm },
  tabOn: { backgroundColor: Colors.surface },
  tabText: { ...Type.bodyStrong, color: Colors.inkMuted },
  tabTextOn: { color: Colors.primary },
  sent: { ...Type.small, color: Colors.inkMuted },
  linkRow: { minHeight: 44, justifyContent: 'center' },
  link: { ...Type.small, fontFamily: Fonts.semibold, color: Colors.primary },
  footer: { ...Type.small, color: Colors.inkMuted },
});
