import { useNavigation } from 'expo-router';
import { useEffect } from 'react';
import { Alert } from 'react-native';

/** Asks before leaving the screen while `dirty` is true. */
export function useUnsavedWarning(dirty: boolean) {
  const navigation = useNavigation();
  useEffect(() => {
    if (!dirty) return;
    return navigation.addListener('beforeRemove', (e) => {
      e.preventDefault();
      Alert.alert('Discard changes?', 'You have changes that are not saved.', [
        { text: 'Keep editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
      ]);
    });
  }, [dirty, navigation]);
}
