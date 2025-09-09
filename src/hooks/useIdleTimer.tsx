import { useEffect, useRef } from 'react';
import { useAuth } from './useAuth';

interface UseIdleTimerProps {
  timeout?: number; // tempo em ms (padrão: 30 minutos)
  onIdle?: () => void;
}

export const useIdleTimer = ({ timeout = 30 * 60 * 1000, onIdle }: UseIdleTimerProps = {}) => {
  const { user, signOut } = useAuth();
  const timeoutRef = useRef<NodeJS.Timeout>();
  const lastActiveRef = useRef<number>(Date.now());

  const resetTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (user) {
      timeoutRef.current = setTimeout(() => {
        console.log('🔒 Usuário inativo por muito tempo. Fazendo logout automático...');
        if (onIdle) {
          onIdle();
        } else {
          signOut();
        }
      }, timeout);
    }
  };

  const handleActivity = () => {
    if (user) {
      lastActiveRef.current = Date.now();
      resetTimer();
    }
  };

  useEffect(() => {
    if (!user) return;

    // Eventos que indicam atividade do usuário
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    // Adicionar listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Iniciar timer
    resetTimer();

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
    };
  }, [user, timeout]);

  return {
    resetTimer,
    lastActive: lastActiveRef.current
  };
};