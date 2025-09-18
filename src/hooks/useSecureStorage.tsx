import { useCallback } from 'react';

interface SecureStorageOptions {
  encrypt?: boolean;
  expirationMinutes?: number;
}

export const useSecureStorage = () => {
  // Simple encryption for client-side (note: not cryptographically secure, but better than plain text)
  const simpleEncrypt = useCallback((text: string): string => {
    return btoa(encodeURIComponent(text));
  }, []);

  const simpleDecrypt = useCallback((encoded: string): string => {
    try {
      return decodeURIComponent(atob(encoded));
    } catch {
      return '';
    }
  }, []);

  const setSecureItem = useCallback((
    key: string, 
    value: string, 
    options: SecureStorageOptions = {}
  ) => {
    try {
      const { encrypt = true, expirationMinutes } = options;
      
      let processedValue = value;
      if (encrypt) {
        processedValue = simpleEncrypt(value);
      }

      const item = {
        value: processedValue,
        encrypted: encrypt,
        timestamp: Date.now(),
        expires: expirationMinutes ? Date.now() + (expirationMinutes * 60 * 1000) : null
      };

      localStorage.setItem(`secure_${key}`, JSON.stringify(item));
    } catch (error) {
      console.warn('Failed to store secure item:', error);
    }
  }, [simpleEncrypt]);

  const getSecureItem = useCallback((key: string): string | null => {
    try {
      const storedItem = localStorage.getItem(`secure_${key}`);
      if (!storedItem) return null;

      const item = JSON.parse(storedItem);
      
      // Check expiration
      if (item.expires && Date.now() > item.expires) {
        localStorage.removeItem(`secure_${key}`);
        return null;
      }

      let value = item.value;
      if (item.encrypted) {
        value = simpleDecrypt(value);
      }

      return value;
    } catch (error) {
      console.warn('Failed to retrieve secure item:', error);
      return null;
    }
  }, [simpleDecrypt]);

  const removeSecureItem = useCallback((key: string) => {
    try {
      localStorage.removeItem(`secure_${key}`);
    } catch (error) {
      console.warn('Failed to remove secure item:', error);
    }
  }, []);

  const clearExpiredItems = useCallback(() => {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('secure_')) {
          const item = localStorage.getItem(key);
          if (item) {
            const parsed = JSON.parse(item);
            if (parsed.expires && Date.now() > parsed.expires) {
              localStorage.removeItem(key);
            }
          }
        }
      });
    } catch (error) {
      console.warn('Failed to clear expired items:', error);
    }
  }, []);

  return {
    setSecureItem,
    getSecureItem,
    removeSecureItem,
    clearExpiredItems
  };
};