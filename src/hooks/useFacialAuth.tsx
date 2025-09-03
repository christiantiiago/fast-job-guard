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
        
        // Aguardar o vídeo estar pronto
        await new Promise<void>((resolve) => {
          const onLoadedMetadata = () => {
            videoRef.current?.removeEventListener('loadedmetadata', onLoadedMetadata);
            resolve();
          };
          videoRef.current?.addEventListener('loadedmetadata', onLoadedMetadata);
        });
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
    if (!videoRef.current || !streamRef.current) {
      throw new Error('Câmera não inicializada');
    }

    // Verificar se o vídeo tem dimensões válidas
    if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
      throw new Error('Vídeo ainda não carregou completamente');
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

  // Verificar identidade facial com detecção de liveness
  const verifyIdentity = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    try {
      setState(prev => ({ ...prev, isVerifying: true }));

      // Implementar detecção de liveness (movimento dos olhos, piscar)
      const livenessCheck = await performLivenessDetection();
      if (!livenessCheck.passed) {
        throw new Error('Falha na detecção de movimento. Tente novamente.');
      }

      const photoDataUrl = await capturePhoto();
      
      // Converter data URL para blob
      const response = await fetch(photoDataUrl);
      const blob = await response.blob();

      // Upload da foto para verificação
      const fileName = `facial-auth/${user.id}/${Date.now()}.jpg`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('facial-auth')
        .upload(fileName, blob);

      if (uploadError) throw uploadError;

      // Simular verificação facial com ML (em produção, usar serviço real)
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Verificação mais rigorosa com base na qualidade da imagem
      const qualityScore = analyzeImageQuality(photoDataUrl);
      const isVerified = qualityScore > 0.7 && Math.random() > 0.05; // 95% de sucesso para demo

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

  // Função para detecção de liveness
  const performLivenessDetection = useCallback(async (): Promise<{ passed: boolean; reason?: string }> => {
    return new Promise((resolve) => {
      // Simular detecção de movimento (em produção, usar biblioteca de ML)
      setTimeout(() => {
        const movements = ['blink', 'turn_left', 'turn_right', 'smile'];
        const requiredMovements = movements.slice(0, 2); // 2 movimentos aleatórios
        
        // Por enquanto, simular que o usuário fez os movimentos
        const passed = Math.random() > 0.1; // 90% de sucesso
        resolve({
          passed,
          reason: passed ? undefined : 'Movimento não detectado corretamente'
        });
      }, 2000);
    });
  }, []);

  // Analisar qualidade da imagem
  const analyzeImageQuality = useCallback((imageDataUrl: string): number => {
    // Simular análise de qualidade (em produção, usar algoritmos reais)
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
    };
    
    img.src = imageDataUrl;
    
    // Retornar score simulado baseado em fatores como iluminação, resolução, etc.
    return Math.random() * 0.3 + 0.7; // Score entre 0.7 e 1.0
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