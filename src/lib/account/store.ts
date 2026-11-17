// The only account file that touches AsyncStorage, so the tested helpers stay pure.
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEFAULT_ADDRESS_KEY = 'docnow_default_address';

export const readDefaultAddressId = () => AsyncStorage.getItem(DEFAULT_ADDRESS_KEY);

export const saveDefaultAddressId = (id: string) => AsyncStorage.setItem(DEFAULT_ADDRESS_KEY, id);

export const forgetDefaultAddressId = () => AsyncStorage.removeItem(DEFAULT_ADDRESS_KEY);
