import { Text, type TextProps } from 'react-native';

import { Colors, Type } from '@/constants/theme';

type Variant = keyof typeof Type;

/** Text in the shared type scale and Inter faces, so screens stop picking sizes by hand. */
export function AppText({ variant = 'body', muted, style, ...props }: TextProps & { variant?: Variant; muted?: boolean }) {
  return <Text {...props} style={[Type[variant], { color: muted ? Colors.inkMuted : Colors.ink }, style]} />;
}
