import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ActionButton, Notice } from '@/components/doctor/ui';
import { Colors, Fonts, Radius, Shadow, Space, Type } from '@/constants/theme';
import {
    addresses as addressApi,
    centreFor,
    isPincode,
    location as locationApi,
    LOCATION_DENIED,
    PINCODE_LENGTH,
    readServiceability,
    serviceabilityText,
    validateAddress,
    type SavedAddress,
    type Serviceable,
} from '@/lib/checkout';
import { currentPosition, describePosition } from '@/lib/checkout/location';
import { friendlyError } from '@/lib/consult/api';

import { MapPicker, type Point } from './map-picker';

interface Props {
    /** Set to edit a saved address; the server replaces it and returns a new id. */
    address?: SavedAddress | null;
    onClose: () => void;
    onSaved: (address: SavedAddress) => void;
}

/**
 * Pick the spot on the map, then add the house details, like the website's two-step dialog.
 * Mounted only while open, so every visit starts from the saved address and not the last edit.
 */
export function AddressSheet({ address, onClose, onSaved }: Props) {
    const [step, setStep] = useState<'map' | 'details'>('map');
    const [centre, setCentre] = useState<Point>(() => centreFor(address));
    const [picked, setPicked] = useState<string>('');
    const [city, setCity] = useState(address?.city ?? '');
    const [pincode, setPincode] = useState(address?.pincode ?? '');
    const [line1, setLine1] = useState(address?.line1 ?? '');
    const [serviceable, setServiceable] = useState<Serviceable>('unknown');
    const [locating, setLocating] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const lookup = useRef(0);

    async function describe(point: Point) {
        const run = ++lookup.current;
        setServiceable('checking');
        const place = await describePosition(point);
        if (run !== lookup.current) return;
        if (place) {
            setPicked(place.formattedAddress);
            if (place.city) setCity(place.city);
            if (place.pincode) setPincode(place.pincode);
        }
        const zip = place?.pincode || pincode;
        if (!isPincode(zip)) {
            setServiceable('unknown');
            return;
        }
        try {
            const reply = await locationApi.serviceability(String(point.latitude), String(point.longitude), zip);
            if (run !== lookup.current) return;
            setServiceable(readServiceability(reply));
        } catch {
            if (run === lookup.current) setServiceable('no');
        }
    }

    function moved(point: Point) {
        setCentre(point);
        void describe(point);
    }

    async function useMyLocation() {
        setLocating(true);
        setError('');
        const result = await currentPosition();
        setLocating(false);
        if (result.kind !== 'position') {
            setError(LOCATION_DENIED);
            return;
        }
        moved(result.position);
    }

    async function save() {
        const input = {
            line1: line1.trim(),
            city: city.trim(),
            pincode: pincode.trim(),
            lat: String(centre.latitude),
            long: String(centre.longitude),
        };
        const problem = validateAddress(input);
        if (problem) {
            setError(problem);
            return;
        }
        setSaving(true);
        setError('');
        try {
            const saved = address ? await addressApi.update(address.id, input) : await addressApi.add(input);
            onSaved(saved);
            onClose();
        } catch (e) {
            setError(friendlyError(e, 'We could not save this address. Please try again.'));
        } finally {
            setSaving(false);
        }
    }

    const close = () => {
        if (saving) return;
        onClose();
    };
    const serviceLine = serviceabilityText(serviceable);

    return (
        <Modal visible animationType="slide" transparent onRequestClose={close}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
                <View style={styles.sheet}>
                    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
                        <Text style={styles.title} accessibilityRole="header">
                            {step === 'map' ? 'Pick the collection location' : 'Add the address details'}
                        </Text>

                        {step === 'map' ? (
                            <>
                                <MapPicker centre={centre} onCentreChange={moved} />
                                <Pressable
                                    onPress={useMyLocation}
                                    disabled={locating}
                                    accessibilityRole="button"
                                    accessibilityLabel="Use my current location"
                                    accessibilityState={{ busy: locating, disabled: locating }}
                                    style={({ pressed }) => [styles.locate, pressed && styles.locatePressed, locating && styles.off]}>
                                    <Text style={styles.locateText}>{locating ? 'Finding you' : 'Use my current location'}</Text>
                                </Pressable>

                                {picked ? <Text style={styles.picked}>{picked}</Text> : null}
                                <Text style={styles.label}>Pincode</Text>
                                <TextInput
                                    style={styles.input}
                                    value={pincode}
                                    onChangeText={(text) => setPincode(text.replace(/[^0-9]/g, ''))}
                                    keyboardType="number-pad"
                                    maxLength={PINCODE_LENGTH}
                                    placeholder="6-digit pincode"
                                    placeholderTextColor={Colors.inkSubtle}
                                    accessibilityLabel="Pincode"
                                />
                                {serviceLine ? (
                                    <Text
                                        style={[styles.service, serviceable === 'no' && styles.serviceNo, serviceable === 'yes' && styles.serviceYes]}
                                        accessibilityLiveRegion="polite">
                                        {serviceLine}
                                    </Text>
                                ) : null}
                                {error ? <Notice tone="error">{error}</Notice> : null}
                                <ActionButton
                                    label="Use this location"
                                    disabled={!isPincode(pincode)}
                                    onPress={() => {
                                        setError('');
                                        setStep('details');
                                    }}
                                />
                            </>
                        ) : (
                            <>
                                {picked ? <Text style={styles.picked}>{picked}</Text> : null}
                                <Text style={styles.label}>House, flat or building</Text>
                                <TextInput
                                    style={styles.input}
                                    value={line1}
                                    onChangeText={setLine1}
                                    placeholder="For example, EWS/2/9, Ashiana Greens"
                                    placeholderTextColor={Colors.inkSubtle}
                                    accessibilityLabel="House, flat or building"
                                    accessibilityHint="Helps the sample collector find you"
                                />
                                <Text style={styles.label}>City</Text>
                                <TextInput
                                    style={styles.input}
                                    value={city}
                                    onChangeText={setCity}
                                    placeholder="City"
                                    placeholderTextColor={Colors.inkSubtle}
                                    accessibilityLabel="City"
                                />
                                <Text style={styles.label}>Pincode</Text>
                                <TextInput
                                    style={styles.input}
                                    value={pincode}
                                    onChangeText={(text) => setPincode(text.replace(/[^0-9]/g, ''))}
                                    keyboardType="number-pad"
                                    maxLength={PINCODE_LENGTH}
                                    placeholder="6-digit pincode"
                                    placeholderTextColor={Colors.inkSubtle}
                                    accessibilityLabel="Pincode"
                                />
                                {error ? <Notice tone="error">{error}</Notice> : null}
                                <ActionButton label="Save address" busyLabel="Saving" busy={saving} onPress={save} />
                                <Pressable
                                    style={styles.secondary}
                                    onPress={() => setStep('map')}
                                    disabled={saving}
                                    accessibilityRole="button"
                                    accessibilityLabel="Change the location">
                                    <Text style={styles.secondaryText}>Change the location</Text>
                                </Pressable>
                            </>
                        )}

                        <Pressable
                            style={styles.secondary}
                            onPress={close}
                            disabled={saving}
                            accessibilityRole="button"
                            accessibilityLabel="Cancel">
                            <Text style={styles.secondaryText}>Cancel</Text>
                        </Pressable>
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(31,26,43,0.4)' },
    sheet: {
        maxHeight: '92%',
        borderTopLeftRadius: Radius.xl,
        borderTopRightRadius: Radius.xl,
        backgroundColor: Colors.surface,
        ...Shadow.raised,
    },
    content: { padding: Space[6], gap: Space[2] },
    title: { ...Type.titleSm, color: Colors.ink, marginBottom: Space[1] },
    label: { ...Type.bodyStrong, marginTop: Space[2], color: Colors.ink },
    input: {
        ...Type.body,
        minHeight: 44,
        paddingHorizontal: Space[3],
        paddingVertical: Space[2],
        borderWidth: 1,
        borderColor: Colors.borderStrong,
        borderRadius: Radius.md,
        color: Colors.ink,
    },
    locate: {
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: Radius.md,
        borderWidth: 1,
        borderColor: Colors.borderStrong,
        backgroundColor: Colors.surface,
    },
    locatePressed: { backgroundColor: Colors.surfaceMuted },
    off: { opacity: 0.5 },
    locateText: { ...Type.small, fontFamily: Fonts.semibold, color: Colors.primary },
    picked: { ...Type.small, color: Colors.inkMuted },
    service: { ...Type.small, color: Colors.inkMuted },
    serviceYes: { color: Colors.successInk },
    serviceNo: { color: Colors.dangerInk },
    secondary: { alignItems: 'center', justifyContent: 'center', minHeight: 44 },
    secondaryText: { ...Type.bodyStrong, color: Colors.ink },
});
