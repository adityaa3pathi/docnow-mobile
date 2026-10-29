import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

/** A solid dot with a soft ring that breathes outward: "live", "in the room". */
export function PulseDot({ color, size = 10 }: { color: string; size?: number }) {
  const [t] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(t, { toValue: 1, duration: 1400, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [t]);
  const ring = {
    opacity: t.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] }),
    transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [1, 2.4] }) }],
  };
  const dot = { width: size, height: size, borderRadius: size / 2, backgroundColor: color };
  return (
    <View style={[styles.wrap, { width: size, height: size }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View style={[StyleSheet.absoluteFill, dot, ring]} />
      <View style={dot} />
    </View>
  );
}

const styles = StyleSheet.create({ wrap: { alignItems: 'center', justifyContent: 'center' } });
