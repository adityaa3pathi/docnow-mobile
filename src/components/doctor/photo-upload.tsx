import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { DoctorAvatar } from '@/components/consult/doctor-card';
import { Colors, Radius, Space, Type } from '@/constants/theme';
import { doctor as doctorApi, friendlyError } from '@/lib/consult/api';
import { photoProblem, toPhotoUpload, type PickedPhoto } from '@/lib/consult/doctorPhoto';

const HINT = 'A clear, recent photo of your face. Patients see it when booking.';

/** Opens the photo library for a square crop. Null means the person backed out. */
export async function pickDoctorPhoto(): Promise<{ photo: PickedPhoto } | { error: string } | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    return { error: 'DocNow needs permission to open your photos. You can allow it in your phone settings.' };
  }
  // A square crop at this quality keeps a phone photo well under the 3 MB the server takes.
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
  });
  const asset = result.canceled ? null : result.assets[0];
  if (!asset) return null;
  const problem = photoProblem(asset);
  return problem ? { error: problem } : { photo: asset };
}

function PhotoRow({ name, uri, busy, label, onPress, hint, error }: {
  name: string;
  uri: string | null;
  busy?: boolean;
  label: string;
  onPress: () => void;
  hint?: string;
  error?: string | null;
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <DoctorAvatar doctor={{ displayName: name || 'Doctor', photoUrl: uri }} size={72} />
        <Pressable
          style={[styles.button, busy && styles.off]}
          onPress={onPress}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={busy ? 'Uploading your photo' : label}
          accessibilityState={{ disabled: !!busy, busy: !!busy }}>
          {busy ? <ActivityIndicator color={Colors.ink} /> : null}
          <Text style={styles.buttonText}>{busy ? 'Uploading...' : label}</Text>
        </Pressable>
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      {error ? <Text style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="polite">{error}</Text> : null}
    </View>
  );
}

/** Picks a photo for an application that has not been sent yet; the upload happens after it saves. */
export function PhotoPickerField({ name, photo, savedPhotoUrl, onPicked, error }: {
  name: string;
  photo: PickedPhoto | null;
  savedPhotoUrl?: string | null;
  onPicked: (photo: PickedPhoto | null) => void;
  error?: string | null;
}) {
  const [pickError, setPickError] = useState<string | null>(null);
  const uri = photo?.uri ?? savedPhotoUrl ?? null;

  const choose = async () => {
    setPickError(null);
    const result = await pickDoctorPhoto();
    if (!result) return;
    if ('error' in result) return setPickError(result.error);
    onPicked(result.photo);
  };

  return (
    <PhotoRow
      name={name}
      uri={uri}
      label={uri ? 'Change photo' : 'Choose photo'}
      onPress={() => void choose()}
      hint={HINT}
      error={pickError ?? error ?? null}
    />
  );
}

/** Picks and uploads the signed-in doctor's photo right away; `onUploaded` gets the new link. */
export function DoctorPhotoUpload({ name, photoUrl, onUploaded }: {
  name: string;
  photoUrl?: string | null;
  onUploaded: (url: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setError(null);
    const picked = await pickDoctorPhoto();
    if (!picked) return;
    if ('error' in picked) return setError(picked.error);
    setBusy(true);
    try {
      const { photoUrl: url } = await doctorApi.uploadPhoto(toPhotoUpload(picked.photo));
      onUploaded(url);
    } catch (e) {
      setError(friendlyError(e, 'We could not upload your photo. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <PhotoRow
      name={name}
      uri={photoUrl ?? null}
      busy={busy}
      label={photoUrl ? 'Change photo' : 'Upload photo'}
      onPress={() => void run()}
      hint={HINT}
      error={error}
    />
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Space[2] },
  row: { flexDirection: 'row', alignItems: 'center', gap: Space[4] },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Space[2], minHeight: 44, paddingHorizontal: Space[4], borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.borderStrong, backgroundColor: Colors.surface },
  off: { opacity: 0.5 },
  buttonText: { ...Type.bodyStrong, color: Colors.ink },
  hint: { ...Type.small, color: Colors.inkMuted },
  error: { ...Type.small, color: Colors.dangerInk },
});
