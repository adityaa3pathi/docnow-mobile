// Copied from docnowtesting/client/src/components/CityLandmarkIcon.tsx: same 24 grid, same stroke
// width and caps, same path data, redrawn with react-native-svg.
import Svg, { Path } from 'react-native-svg';

import { Colors } from '@/constants/theme';
import { LANDMARK_GROUND, LANDMARKS } from '@/lib/location/landmarks';

export function CityLandmarkIcon({ city, size = 32, color = Colors.primary }: { city: string; size?: number; color?: string }) {
  const landmark = LANDMARKS[city];
  if (!landmark) return null;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no">
      {[...landmark.d, LANDMARK_GROUND].map((d) => (
        <Path key={d} d={d} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </Svg>
  );
}

/** The landmark's name, for the screen-reader label on a city tile. */
export function landmarkTitle(city: string): string | null {
  return LANDMARKS[city]?.title ?? null;
}
