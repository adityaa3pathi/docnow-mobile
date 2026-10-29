import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Colors, Radius } from '@/constants/theme';

interface EmptyStateProps {
  icon?: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondaryAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function EmptyState({
  icon = '🧪',
  title,
  subtitle,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondaryAction,
  style,
}: EmptyStateProps) {
  return (
    <View style={[styles.container, style]}>
      {/* Layered rings give the emoji a lightweight "illustration" feel */}
      <View style={styles.ringOuter}>
        <View style={styles.ringInner}>
          <Text style={styles.icon}>{icon}</Text>
        </View>
      </View>

      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

      {actionLabel && onAction ? (
        <Pressable
          style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          onPress={onAction}>
          <Text style={styles.primaryBtnText}>{actionLabel}</Text>
        </Pressable>
      ) : null}

      {secondaryLabel && onSecondaryAction ? (
        <Pressable
          style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          hitSlop={8}
          onPress={onSecondaryAction}>
          <Text style={styles.secondaryBtnText}>{secondaryLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

interface ErrorRetryStateProps {
  title?: string;
  message?: string;
  onRetry: () => void;
  retrying?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function ErrorRetryState({
  title = 'Couldn’t load this right now',
  message = 'Please check your internet connection and try again.',
  onRetry,
  retrying = false,
  style,
}: ErrorRetryStateProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.errorCard}>
        <View style={styles.errorIconWrap}>
          <Text style={styles.errorIcon}>📡</Text>
        </View>
        <Text style={styles.errorTitle} accessibilityRole="header">
          {title}
        </Text>
        <Text style={styles.errorMessage}>{message}</Text>
        <Pressable
          style={({ pressed }) => [styles.retryBtn, (pressed || retrying) && styles.pressed]}
          accessibilityRole="button"
          accessibilityState={{ busy: retrying, disabled: retrying }}
          disabled={retrying}
          onPress={onRetry}>
          {retrying ? (
            <ActivityIndicator color={Colors.primary} size="small" />
          ) : (
            <Text style={styles.retryBtnText}>Try Again ↻</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  ringOuter: {
    width: 120,
    height: 120,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringInner: {
    width: 84,
    height: 84,
    borderRadius: Radius.full,
    backgroundColor: Colors.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 40,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.foreground,
    marginTop: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: Colors.mutedForeground,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
  },
  primaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: 24,
    paddingVertical: 14,
    marginTop: 24,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  primaryBtnText: {
    color: Colors.primaryForeground,
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryBtn: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  secondaryBtnText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.75,
  },
  errorCard: {
    alignSelf: 'stretch',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 24,
  },
  errorIconWrap: {
    width: 64,
    height: 64,
    borderRadius: Radius.full,
    backgroundColor: Colors.destructiveTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorIcon: {
    fontSize: 28,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.foreground,
    marginTop: 14,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 13,
    color: Colors.mutedForeground,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 18,
  },
  retryBtn: {
    marginTop: 18,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 11,
    paddingHorizontal: 28,
    minWidth: 150,
    alignItems: 'center',
  },
  retryBtnText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
});
