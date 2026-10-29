import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Radius } from '@/constants/theme';

interface NetworkBannerProps {
  visible: boolean;
  message?: string;
  onTryVideoAgain?: () => void;
}

export function NetworkBanner({
  visible,
  message = 'Switched to audio-only due to weak network',
  onTryVideoAgain,
}: NetworkBannerProps) {
  if (!visible) return null;

  return (
    <View style={styles.bannerContainer} accessibilityRole="alert">
      <View style={styles.iconBox}>
        <Text style={styles.icon}>📶</Text>
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title} numberOfLines={2}>
          {message}
        </Text>
      </View>
      {onTryVideoAgain ? (
        <Pressable
          style={styles.actionButton}
          onPress={onTryVideoAgain}
          accessibilityRole="button"
          accessibilityLabel="Try video again">
          <Text style={styles.actionText}>Try Video</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bannerContainer: {
    position: 'absolute',
    top: 54,
    left: 16,
    right: 16,
    zIndex: 50,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.94)',
    borderWidth: 1,
    borderColor: '#f59e0b',
    borderRadius: Radius.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 16,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fef3c7',
    lineHeight: 18,
  },
  actionButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#f59e0b',
    borderRadius: Radius.md,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
});
