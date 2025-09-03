import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface FacialAuthState {
  isActive: boolean;
  isCapturing: boolean;
  isVerifying: boolean;
  isEnrolling: boolean;
  isEnrolled: boolean;
  lastVerification: Date | null;
  verificationRequired: boolean;
  enrollmentRequired: boolean;
}

export const useFacialAuth = () => {
  const { user } = useAuth();
  const [state, setState] = useState<FacialAuthState>({
    isActive: false,
    isCapturing: false,
    isVerifying: false,
    isEnrolling: false,
    isEnrolled: false,
    lastVerification: null,
    verificationRequired: false,
    enrollmentRequired: false,
  });
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Check enrollment status on component mount
  useEffect(() => {
    if (user) {
      checkEnrollmentStatus();
    }
  }, [user]);

  // Check if user has completed facial enrollment
  const checkEnrollmentStatus = useCallback(async () => {
    if (!user) return;

    try {
      const { data: enrollment } = await supabase
        .from('facial_enrollment')
        .select('id, is_active')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      const { data: profile } = await supabase
        .from('profiles')
        .select('facial_enrollment_status')
        .eq('user_id', user.id)
        .maybeSingle();

      const isEnrolled = !!enrollment && profile?.facial_enrollment_status === 'completed';
      
      setState(prev => ({
        ...prev,
        isEnrolled,
        enrollmentRequired: !isEnrolled,
      }));
    } catch (error) {
      console.error('Error checking enrollment status:', error);
    }
  }, [user]);

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

  // Helper function to convert dataURL to File
  const dataURLtoFile = (dataurl: string, filename: string): File => {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };

  // Facial Enrollment Process (First Time)
  const enrollFace = useCallback(async (): Promise<boolean> => {
    if (!user) throw new Error('Usuário não autenticado');
    if (!videoRef.current || !streamRef.current) {
      throw new Error('Câmera não está ativa');
    }

    setState(prev => ({ ...prev, isEnrolling: true }));

    try {
      // 1. Perform liveness detection
      console.log('Iniciando detecção de vida para enrollment...');
      const livenessResult = await performLivenessDetection();
      
      if (!livenessResult.passed) {
        throw new Error(`Falha na detecção de vida: ${livenessResult.reason}`);
      }

      // 2. Capture high-quality reference photo
      const photoDataUrl = await capturePhoto();
      if (!photoDataUrl) {
        throw new Error('Falha ao capturar foto de referência');
      }

      // 3. Analyze image quality (higher threshold for enrollment)
      const qualityScore = analyzeImageQuality(photoDataUrl);
      console.log('Pontuação de qualidade para enrollment:', qualityScore);

      if (qualityScore < 0.85) {
        throw new Error('Qualidade da imagem insuficiente para enrollment. Verifique a iluminação e posição.');
      }

      // 4. Upload reference photo to Supabase storage
      const photoFile = dataURLtoFile(photoDataUrl, `enrollment_${Date.now()}.jpg`);
      const filePath = `${user.id}/enrollment/${Date.now()}_reference.jpg`;
      
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('facial-auth')
        .upload(filePath, photoFile);

      if (uploadError) {
        console.error('Error uploading enrollment photo:', uploadError);
        throw new Error('Falha ao fazer upload da foto de referência');
      }

      // 5. Generate face embedding (simulate ML processing)
      const faceEmbedding = generateMockEmbedding(photoDataUrl);

      // 6. Save enrollment data to database
      const { error: enrollmentError } = await supabase
        .from('facial_enrollment')
        .insert({
          user_id: user.id,
          reference_photo_url: uploadData.path,
          face_embedding: faceEmbedding,
          quality_score: qualityScore * 100,
          metadata: {
            liveness_check: livenessResult,
            device_info: navigator.userAgent,
          },
        });

      if (enrollmentError) {
        console.error('Error saving enrollment:', enrollmentError);
        throw new Error('Falha ao salvar dados de enrollment');
      }

      // 7. Update profile status
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          facial_enrollment_status: 'completed',
          facial_enrollment_completed_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (profileError) {
        console.error('Error updating profile:', profileError);
        throw new Error('Falha ao atualizar status do perfil');
      }

      // 8. Update state
      setState(prev => ({
        ...prev,
        isEnrolled: true,
        enrollmentRequired: false,
      }));

      console.log('Enrollment facial concluído com sucesso!');
      return true;

    } catch (error) {
      console.error('Erro no enrollment facial:', error);
      
      // Update profile with failed status
      await supabase
        .from('profiles')
        .update({ facial_enrollment_status: 'failed' })
        .eq('user_id', user.id);

      throw error;
    } finally {
      setState(prev => ({ ...prev, isEnrolling: false }));
    }
  }, [user]);
  // Identity Verification Process
  const verifyIdentity = useCallback(async (): Promise<boolean> => {
    if (!user) throw new Error('Usuário não autenticado');
    if (!state.isEnrolled) throw new Error('Enrollment não foi concluído');
    if (!videoRef.current || !streamRef.current) {
      throw new Error('Câmera não está ativa');
    }

    setState(prev => ({ ...prev, isVerifying: true }));

    try {
      // 1. Get enrollment reference data
      const { data: enrollment, error: enrollmentError } = await supabase
        .from('facial_enrollment')
        .select('face_embedding, quality_score')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (enrollmentError || !enrollment) {
        throw new Error('Dados de referência não encontrados');
      }

      // 2. Perform liveness detection
      console.log('Iniciando detecção de vida...');
      const livenessResult = await performLivenessDetection();
      
      if (!livenessResult.passed) {
        throw new Error(`Falha na detecção de vida: ${livenessResult.reason}`);
      }

      // 3. Capture verification photo
      const photoDataUrl = await capturePhoto();
      if (!photoDataUrl) {
        throw new Error('Falha ao capturar foto para verificação');
      }

      // 4. Analyze image quality
      const qualityScore = analyzeImageQuality(photoDataUrl);
      console.log('Pontuação de qualidade da verificação:', qualityScore);

      if (qualityScore < 0.7) {
        throw new Error('Qualidade da imagem muito baixa. Tente novamente com melhor iluminação.');
      }

      // 5. Upload verification photo
      const photoFile = dataURLtoFile(photoDataUrl, `verification_${Date.now()}.jpg`);
      const filePath = `${user.id}/verifications/${Date.now()}_verification.jpg`;
      
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('facial-auth')
        .upload(filePath, photoFile);

      if (uploadError) {
        console.error('Error uploading verification photo:', uploadError);
      }

      // 6. Compare with enrollment data (simulate ML comparison)
      const verificationEmbedding = generateMockEmbedding(photoDataUrl);
      const confidenceScore = compareFaceEmbeddings(enrollment.face_embedding, verificationEmbedding);
      
      console.log('Pontuação de confiança:', confidenceScore);
      
      // 7. Determine verification result (threshold: 85%)
      const verificationSuccess = confidenceScore >= 85;
      const failureReason = verificationSuccess ? null : 
        confidenceScore < 50 ? 'Rosto não reconhecido' :
        confidenceScore < 70 ? 'Baixa confiança na correspondência' :
        'Limiar de confiança não atingido';

      // 8. Log verification attempt
      await supabase.from('facial_verification_logs').insert({
        user_id: user.id,
        verification_photo_url: uploadData?.path,
        confidence_score: confidenceScore,
        verification_result: verificationSuccess,
        failure_reason: failureReason,
        action_requested: 'admin_access',
        metadata: {
          quality_score: qualityScore * 100,
          liveness_check: livenessResult,
          device_info: navigator.userAgent,
        },
      });

      // 9. Update state and profile
      if (verificationSuccess) {
        setState(prev => ({
          ...prev,
          lastVerification: new Date(),
          verificationRequired: false,
        }));

        // Update last verification timestamp
        await supabase
          .from('profiles')
          .update({ last_facial_verification_at: new Date().toISOString() })
          .eq('user_id', user.id);

        console.log('Verificação facial bem-sucedida!');
        return true;
      } else {
        throw new Error(failureReason || 'Falha na verificação de identidade');
      }

    } catch (error) {
      console.error('Erro na verificação de identidade:', error);
      
      // Log failed verification
      await supabase.from('facial_verification_logs').insert({
        user_id: user.id,
        verification_result: false,
        failure_reason: error instanceof Error ? error.message : 'Erro desconhecido',
        action_requested: 'admin_access',
        metadata: {
          timestamp: new Date().toISOString(),
          device_info: navigator.userAgent,
        },
      });

      throw error;
    } finally {
      setState(prev => ({ ...prev, isVerifying: false }));
    }
  }, [user, state.isEnrolled]);

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

  // Helper function to generate mock face embedding (replace with actual ML)
  const generateMockEmbedding = (imageData: string) => {
    // In real implementation, this would use ML models to extract facial features
    const hash = imageData.substring(0, 100); // Simple mock
    return {
      version: '1.0',
      embedding: Array.from({ length: 128 }, (_, i) => Math.sin(i + hash.length)),
      extraction_timestamp: new Date().toISOString(),
    };
  };

  // Helper function to compare face embeddings (replace with actual ML)
  const compareFaceEmbeddings = (reference: any, verification: any): number => {
    // In real implementation, this would use cosine similarity or similar metrics
    const similarity = Math.random() * 40 + 60; // Mock similarity between 60-100
    return Math.round(similarity);
  };

  return {
    state,
    videoRef,
    canvasRef,
    startCapture,
    stopCapture,
    enrollFace,
    verifyIdentity,
    checkEnrollmentStatus,
    checkVerificationNeeded,
    triggerRandomVerification,
  };
};