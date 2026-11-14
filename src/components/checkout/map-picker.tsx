import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { PROVIDER_DEFAULT, type Region } from 'react-native-maps';

import { Colors, Radius, Space, Type } from '@/constants/theme';
import { DEFAULT_DELTA } from '@/lib/checkout';

export interface Point {
    latitude: number;
    longitude: number;
}

interface Props {
    /** Where the map should sit. Changing it, such as after "use my location", moves the map. */
    centre: Point;
    onCentreChange: (point: Point) => void;
    height?: number;
}

const SAME = 1e-5;
const same = (a: Point, b: Point) =>
    Math.abs(a.latitude - b.latitude) < SAME && Math.abs(a.longitude - b.longitude) < SAME;

/**
 * The pin stays in the middle and the map moves under it, which needs no precise dragging. Reports
 * the middle once the map settles. The only file that loads react-native-maps.
 */
export function MapPicker({ centre, onCentreChange, height = 240 }: Props) {
    const map = useRef<MapView | null>(null);
    const shown = useRef<Point>(centre);

    useEffect(() => {
        if (same(shown.current, centre)) return;
        shown.current = centre;
        map.current?.animateToRegion({ ...centre, latitudeDelta: DEFAULT_DELTA, longitudeDelta: DEFAULT_DELTA }, 400);
    }, [centre]);

    function settled(region: Region) {
        const point = { latitude: region.latitude, longitude: region.longitude };
        if (same(shown.current, point)) return;
        shown.current = point;
        onCentreChange(point);
    }

    return (
        <View style={[styles.wrap, { height }]}>
            <MapView
                ref={map}
                style={styles.map}
                provider={PROVIDER_DEFAULT}
                initialRegion={{ ...centre, latitudeDelta: DEFAULT_DELTA, longitudeDelta: DEFAULT_DELTA }}
                onRegionChangeComplete={settled}
                accessibilityLabel="Map of the collection location. Move the map to place the pin."
                showsUserLocation={false}
                toolbarEnabled={false}
            />
            <View style={styles.pinBox} pointerEvents="none">
                <View style={styles.pin} />
                <View style={styles.pinStem} />
            </View>
            <Text style={styles.hint} pointerEvents="none">
                Move the map to place the pin
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: { overflow: 'hidden', borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border },
    map: { flex: 1 },
    pinBox: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center' },
    pin: { width: 18, height: 18, borderRadius: Radius.full, borderWidth: 4, borderColor: Colors.primary, backgroundColor: Colors.onPrimary },
    pinStem: { width: 2, height: 14, backgroundColor: Colors.primary },
    hint: {
        ...Type.small,
        position: 'absolute',
        bottom: Space[2],
        alignSelf: 'center',
        paddingHorizontal: Space[2],
        paddingVertical: Space[1],
        borderRadius: Radius.sm,
        color: Colors.ink,
        backgroundColor: 'rgba(255,255,255,0.9)',
    },
});
