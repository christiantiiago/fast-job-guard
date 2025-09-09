import { useState, useEffect } from 'react';
import { usePremiumStatus } from './usePremiumStatus';

const POPUP_KEY = 'premium_popup_last_shown';
const POPUP_INTERVAL = 5 * 60 * 60 * 1000; // 5 horas em milliseconds

export const usePremiumPopup = () => {
  const { isPremium } = usePremiumStatus();
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    if (isPremium) return; // Não mostrar se já é premium

    const checkShouldShowPopup = () => {
      const lastShown = localStorage.getItem(POPUP_KEY);
      const now = Date.now();
      
      if (!lastShown) {
        // Primeira vez - mostrar após 30 minutos
        setTimeout(() => {
          setShowPopup(true);
        }, 30 * 60 * 1000);
        return;
      }

      const timeSinceLastShown = now - parseInt(lastShown);
      
      if (timeSinceLastShown >= POPUP_INTERVAL) {
        // Mostrar popup com uma chance aleatória para não ser sempre no mesmo momento
        const randomDelay = Math.random() * 30 * 60 * 1000; // 0-30 minutos aleatório
        setTimeout(() => {
          setShowPopup(true);
        }, randomDelay);
      }
    };

    checkShouldShowPopup();
  }, [isPremium]);

  const closePopup = () => {
    setShowPopup(false);
    localStorage.setItem(POPUP_KEY, Date.now().toString());
  };

  const resetPopupTimer = () => {
    localStorage.removeItem(POPUP_KEY);
  };

  return {
    showPopup,
    closePopup,
    resetPopupTimer
  };
};