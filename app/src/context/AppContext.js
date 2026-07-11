// Lightweight app-wide state: the demo customer id + AA consent artefact, shared by
// every screen so we only fetch /customers/default and POST /aa/consent once per
// session. Persisted to AsyncStorage so relaunching the app during the demo doesn't
// force judges to redo onboarding.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "mia-wealth:onboarding";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [customerId, setCustomerId] = useState(null);
  const [consent, setConsent] = useState(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const saved = JSON.parse(raw);
          if (saved?.customerId) setCustomerId(saved.customerId);
          if (saved?.consent) setConsent(saved.consent);
        }
      } catch (e) {
        // Non-fatal — worst case, the user just onboards again.
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  function completeOnboarding(nextCustomerId, nextConsent) {
    setCustomerId(nextCustomerId);
    setConsent(nextConsent);
    AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ customerId: nextCustomerId, consent: nextConsent })
    ).catch(() => {});
  }

  function resetOnboarding() {
    setCustomerId(null);
    setConsent(null);
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  }

  const value = useMemo(
    () => ({
      customerId,
      consent,
      hydrated,
      isOnboarded: Boolean(customerId && consent),
      completeOnboarding,
      resetOnboarding,
    }),
    [customerId, consent, hydrated]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
