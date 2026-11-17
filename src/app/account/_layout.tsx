import { Stack } from 'expo-router';

import { Colors, Fonts } from '@/constants/theme';

export default function AccountLayout() {
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
            <Stack.Screen name="family" options={{ title: 'Family members' }} />
            <Stack.Screen name="addresses" options={{ title: 'Addresses' }} />
            <Stack.Screen name="wallet" options={{ title: 'Wallet' }} />
            <Stack.Screen name="referrals" options={{ title: 'Refer and earn' }} />
            <Stack.Screen name="edit" options={{ title: 'Edit profile' }} />
            <Stack.Screen name="password" options={{ title: 'Change password' }} />
        </Stack>
    );
}
