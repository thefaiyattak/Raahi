import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { ThemedAlertModal, ThemedAlertButton } from '../components/ThemedAlertModal';

export interface AlertOptions {
  title: string;
  message?: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  iconName?: string;
  buttons?: ThemedAlertButton[];
  autoDismissMs?: number; // default 4000ms
}

interface AlertContextType {
  showAlert: (options: AlertOptions) => void;
  hideAlert: () => void;
}

const AlertContext = createContext<AlertContextType>({
  showAlert: () => {},
  hideAlert: () => {},
});

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [alertState, setAlertState] = useState<AlertOptions | null>(null);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const hideAlert = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setVisible(false);
    setAlertState(null);
  }, []);

  const showAlert = useCallback((options: AlertOptions) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    setAlertState(options);
    setVisible(true);

    // Auto-dismiss after timeout (default 4000ms / 4s) unless buttons requires multiple choices
    const autoDismiss = options.autoDismissMs !== undefined ? options.autoDismissMs : 4000;
    
    // Only auto-dismiss if there isn't multiple confirmation choices, or if explicitly requested
    if (autoDismiss > 0 && (!options.buttons || options.buttons.length <= 1)) {
      timerRef.current = setTimeout(() => {
        hideAlert();
      }, autoDismiss);
    }
  }, [hideAlert]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return (
    <AlertContext.Provider value={{ showAlert, hideAlert }}>
      {children}
      {alertState ? (
        <ThemedAlertModal
          visible={visible}
          title={alertState.title}
          message={alertState.message}
          type={alertState.type}
          iconName={alertState.iconName}
          buttons={alertState.buttons}
          autoDismissMs={alertState.autoDismissMs ?? 4000}
          onClose={hideAlert}
        />
      ) : null}
    </AlertContext.Provider>
  );
};

export const useAlert = () => useContext(AlertContext);

// Drop-in replacement global helper that matches Alert.alert API
let globalShowAlert: ((opts: AlertOptions) => void) | null = null;

export const setGlobalAlertHandler = (handler: (opts: AlertOptions) => void) => {
  globalShowAlert = handler;
};

export const showThemedAlert = (
  title: string,
  message?: string,
  buttons?: ThemedAlertButton[] | Array<{ text?: string; onPress?: () => void; style?: string }>,
  options?: { type?: 'success' | 'error' | 'warning' | 'info'; iconName?: string; autoDismissMs?: number }
) => {
  const mappedButtons: ThemedAlertButton[] | undefined = buttons?.map(b => ({
    text: b.text || 'OK',
    onPress: b.onPress,
    style: (b.style as ThemedAlertButton['style']) || 'default',
  }));

  if (globalShowAlert) {
    globalShowAlert({
      title,
      message,
      buttons: mappedButtons,
      type: options?.type || (title.toLowerCase().includes('error') || title.toLowerCase().includes('fail') ? 'error' : title.toLowerCase().includes('success') || title.toLowerCase().includes('switched') || title.toLowerCase().includes('sent') || title.toLowerCase().includes('saved') || title.toLowerCase().includes('uploaded') ? 'success' : 'info'),
      iconName: options?.iconName,
      autoDismissMs: options?.autoDismissMs ?? 4000,
    });
  }
};
