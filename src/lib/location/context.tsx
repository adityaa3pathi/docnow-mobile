/** The chosen city, stored under the same key the website's LocationContext uses. */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { NO_CITY } from './cities';

const CITY_KEY = 'docnow_selected_city';

interface LocationValue {
  selectedCity: string;
  updateCity: (city: string) => void;
  isInitialized: boolean;
}

const LocationContext = createContext<LocationValue | undefined>(undefined);

export function LocationProvider({ children }: { children: ReactNode }) {
  const [selectedCity, setSelectedCity] = useState(NO_CITY);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    let live = true;
    void AsyncStorage.getItem(CITY_KEY)
      .catch(() => null)
      .then((saved) => {
        if (!live) return;
        if (saved) setSelectedCity(saved);
        setIsInitialized(true);
      });
    return () => {
      live = false;
    };
  }, []);

  const updateCity = useCallback((city: string) => {
    setSelectedCity(city);
    // The city is a convenience, so a failed write costs nothing beyond the next restart.
    void AsyncStorage.setItem(CITY_KEY, city).catch(() => {});
  }, []);

  const value = useMemo(() => ({ selectedCity, updateCity, isInitialized }), [selectedCity, updateCity, isInitialized]);
  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useLocationCity() {
  const context = useContext(LocationContext);
  if (!context) throw new Error('useLocationCity must be used inside LocationProvider');
  return context;
}
