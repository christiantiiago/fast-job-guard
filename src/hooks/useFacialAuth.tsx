import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface FacialAuthState {
  isActive: boolean;
  isCapturing: boolean;
  isVerifying: boolean;
  lastVerification: Date | null;
  verificationRequired: boolean;
}

export const useFacialAuth = () => {
  const { user } = useAuth();
  const [state, setState] = useState<FacialAuthState>({
    isActive: false,
    isCapturing: false,
    isVerifying: false,
    lastVerification: null,
    verificationRequired: false
  });
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Iniciar captura de vídeo
  const startCapture = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isCapturing: true }));
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: 640,
          height: 480,
          facingMode: 'user'
        },
        audio: false
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }

      setState(prev => ({ ...prev, isActive: true, isCapturing: false }));
    } catch (error) {
      console.error('Error accessing camera:', error);
      setState(prev => ({ ...prev, isCapturing: false }));
      throw new Error('Não foi possível acessar a câmera');
    }
  }, []);

  // Parar captura
  const stopCapture = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setState(prev => ({ 
      ...prev, 
      isActive: false, 
      isCapturing: false 
    }));
  }, []);

  // Capturar foto para verificação
  const capturePhoto = useCallback(async (): Promise<string> => {
    if (!videoRef.current) {
      throw new Error('Câmera não inicializada');
    }

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (!context) {
      throw new Error('Não foi possível criar canvas');
    }

    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    
    context.drawImage(videoRef.current, 0, 0);
    
    return canvas.toDataURL('image/jpeg', 0.8);
  }, []);

  // Verificar identidade facial
  const verifyIdentity = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    try {
      setState(prev => ({ ...prev, isVerifying: true }));

      const photoDataUrl = await capturePhoto();
      
      // Converter data URL para blob
      const response = await fetch(photoDataUrl);
      const blob = await response.blob();

      // Upload da foto para verificação
      const fileName = `facial-auth/${user.id}/${Date.now()}.jpg`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, blob);

      if (uploadError) throw uploadError;

      // Simular verificação facial (em produção, integrar com serviço de ML)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Por enquanto, sempre aprovar (em produção, fazer análise real)
      const isVerified = Math.random() > 0.1; // 90% de sucesso para demo

      if (isVerified) {
        setState(prev => ({ 
          ...prev, 
          lastVerification: new Date(),
          verificationRequired: false,
          isVerifying: false
        }));

        // Log da verificação
        await supabase.from('audit_logs').insert({
          action: 'facial_verification',
          entity_type: 'user',
          entity_id: user.id,
          metadata: {
            success: true,
            photo_path: uploadData.path
          }
        });
      } else {
        setState(prev => ({ ...prev, isVerifying: false }));
        
        await supabase.from('audit_logs').insert({
          action: 'facial_verification_failed',
          entity_type: 'user', 
          entity_id: user.id,
          metadata: {
            success: false,
            reason: 'Face not recognized'
          }
        });
      }

      return isVerified;
    } catch (error) {
      console.error('Error during facial verification:', error);
      setState(prev => ({ ...prev, isVerifying: false }));
      return false;
    }
  }, [user, capturePhoto]);

  // Verificar se precisa de nova verificação (a cada 2 horas para admins)
  const checkVerificationNeeded = useCallback(() => {
    if (!state.lastVerification) {
      setState(prev => ({ ...prev, verificationRequired: true }));
      return true;
    }

    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const needed = state.lastVerification < twoHoursAgo;
    
    if (needed) {
      setState(prev => ({ ...prev, verificationRequired: true }));
    }

    return needed;
  }, [state.lastVerification]);

  // Verificação aleatória (5% de chance a cada ação crítica)
  const triggerRandomVerification = useCallback(() => {
    if (Math.random() < 0.05) {
      setState(prev => ({ ...prev, verificationRequired: true }));
      return true;
    }
    return false;
  }, []);

  return {
    state,
    videoRef,
    startCapture,
    stopCapture,
    verifyIdentity,
    checkVerificationNeeded,
    triggerRandomVerification
  };
};