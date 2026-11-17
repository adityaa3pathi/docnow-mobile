import type { ConfigContext, ExpoConfig } from 'expo/config';

const LOCATION_PERMISSION = 'DocNow uses your location to fill in your address for sample collection.';

/**
 * Everything static stays in app.json; this only adds what must come from the environment.
 * The Android Maps key lives in EAS secrets as GOOGLE_MAPS_ANDROID_API_KEY, never in git.
 */
export default ({ config }: ConfigContext): ExpoConfig => ({
    ...config,
    name: config.name ?? 'DocNow',
    slug: config.slug ?? 'docnow-mobile',
    android: {
        ...config.android,
        config: {
            ...config.android?.config,
            googleMaps: { apiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY },
        },
    },
    // iOS uses Apple Maps through react-native-maps, so it needs no key.
    plugins: [
        ...(config.plugins ?? []),
        ['expo-location', { locationWhenInUsePermission: LOCATION_PERMISSION }],
    ],
});
