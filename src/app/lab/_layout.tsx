import { Stack } from 'expo-router';

import { Colors, Fonts } from '@/constants/theme';

export default function LabLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: true,
                headerTintColor: Colors.primary,
                headerTitleStyle: { color: Colors.ink, fontFamily: Fonts.semibold },
                headerStyle: { backgroundColor: Colors.surface },
                headerShadowVisible: false,
                headerBackTitle: 'Back',
            }}>
            <Stack.Screen name="bookings" options={{ title: 'Lab bookings' }} />
            <Stack.Screen name="booking/[id]" options={{ title: 'Booking' }} />
            <Stack.Screen name="reports" options={{ title: 'Lab reports' }} />
        </Stack>
    );
}
