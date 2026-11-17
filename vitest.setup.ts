import { vi } from 'vitest';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn().mockResolvedValue(null),
  setItemAsync: vi.fn().mockResolvedValue(undefined),
  deleteItemAsync: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('expo-haptics', () => ({
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
  impactAsync: vi.fn().mockResolvedValue(undefined),
  selectionAsync: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: any) => children,
  SafeAreaView: ({ children }: any) => children,
}));

vi.mock('@livekit/react-native', () => ({
  useRemoteParticipants: () => [],
  useRoomContext: () => null,
  VideoView: () => null,
  AudioTrack: () => null,
}));


// Icons and SVG are native modules; in jsdom an icon renders as an empty element so screens still mount.
vi.mock('lucide-react-native', async () => {
  const { createElement } = await import('react');
  const { View } = await import('react-native');
  const Icon = (props: { testID?: string }) => createElement(View, { testID: props.testID });
  return new Proxy({} as Record<string, unknown>, {
    get: (_t, key) => (key === 'then' ? undefined : key === '__esModule' ? true : Icon),
    has: () => true,
  });
});

vi.mock('react-native-svg', async () => {
  const { createElement } = await import('react');
  const { View } = await import('react-native');
  const Group = ({ children }: { children?: unknown }) => createElement(View, null, children as never);
  const Shape = () => null;
  return { __esModule: true, default: Group, Svg: Group, G: Group, Defs: Group, LinearGradient: Group, Stop: Shape, Circle: Shape, Path: Shape, Rect: Shape };
});

vi.mock('expo-linear-gradient', async () => {
  const { createElement } = await import('react');
  const { View } = await import('react-native');
  return {
    LinearGradient: ({ children, style, testID }: { children?: unknown; style?: unknown; testID?: string }) =>
      createElement(View, { style: style as never, testID }, children as never),
  };
});
