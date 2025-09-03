import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useFacialAuth } from './useFacialAuth';

interface AdminFacialAuthState {
  isBlocked: boolean;
  showModal: boolean;
  isRequired: boolean;
  lastCheck: Date | null;
  modalMode: 'enrollment' | 'verification';
  actionBlocked?: string;
}

export const useAdminFacialAuth = () => {
  const { user, userRole } = useAuth();
  const { state: facialState, checkEnrollmentStatus, checkVerificationNeeded } = useFacialAuth();
  
  const [authState, setAuthState] = useState<AdminFacialAuthState>({
    isBlocked: false,
    showModal: false,
    isRequired: false,
    lastCheck: null,
    modalMode: 'verification',
  });

  // Check if user is admin
  const isAdmin = userRole === 'admin';

  // Initialize facial auth requirements
  useEffect(() => {
    if (user && isAdmin) {
      checkEnrollmentStatus();
      checkInitialRequirements();
    }
  }, [user, isAdmin]);

  // Monitor facial auth state changes
  useEffect(() => {
    if (isAdmin && facialState) {
      const needsEnrollment = facialState.enrollmentRequired;
      const needsVerification = facialState.verificationRequired || checkVerificationNeeded();
      
      if (needsEnrollment) {
        setAuthState(prev => ({
          ...prev,
          isBlocked: true,
          showModal: true,
          modalMode: 'enrollment',
          isRequired: true,
        }));
      } else if (needsVerification) {
        setAuthState(prev => ({
          ...prev,
          isBlocked: true,
          showModal: true,
          modalMode: 'verification',
          isRequired: true,
        }));
      }
    }
  }, [isAdmin, facialState, checkVerificationNeeded]);

  // Check initial requirements when component mounts
  const checkInitialRequirements = useCallback(async () => {
    if (!user || !isAdmin) return;

    try {
      // Check if enrollment is completed
      if (facialState.enrollmentRequired) {
        setAuthState(prev => ({
          ...prev,
          isBlocked: true,
          showModal: true,
          modalMode: 'enrollment',
          isRequired: true,
        }));
        return;
      }

      // Check if verification is needed
      const verificationNeeded = checkVerificationNeeded();
      if (verificationNeeded) {
        setAuthState(prev => ({
          ...prev,
          isBlocked: true,
          showModal: true,
          modalMode: 'verification',
          isRequired: true,
        }));
      }
    } catch (error) {
      console.error('Error checking facial auth requirements:', error);
    }
  }, [user, isAdmin, facialState.enrollmentRequired, checkVerificationNeeded]);

  // Request facial authentication for critical actions
  const requireFacialAuth = useCallback((action: string = 'admin_action') => {
    if (!isAdmin) return true; // Non-admins don't need facial auth
    
    // Check if enrollment is required first
    if (facialState.enrollmentRequired) {
      setAuthState(prev => ({
        ...prev,
        isBlocked: true,
        showModal: true,
        modalMode: 'enrollment',
        isRequired: true,
        actionBlocked: action,
      }));
      return false;
    }

    // Check if verification is needed
    const verificationNeeded = checkVerificationNeeded();
    if (verificationNeeded || !facialState.lastVerification) {
      setAuthState(prev => ({
        ...prev,
        isBlocked: true,
        showModal: true,
        modalMode: 'verification',
        isRequired: true,
        actionBlocked: action,
      }));
      return false;
    }

    // Check if last verification was more than 2 hours ago
    if (facialState.lastVerification) {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      if (facialState.lastVerification < twoHoursAgo) {
        setAuthState(prev => ({
          ...prev,
          isBlocked: true,
          showModal: true,
          modalMode: 'verification',
          isRequired: true,
          actionBlocked: action,
        }));
        return false;
      }
    }

    return true; // Auth is valid, allow action
  }, [isAdmin, facialState, checkVerificationNeeded]);

  // Handle successful authentication
  const handleAuthSuccess = useCallback(() => {
    setAuthState(prev => ({
      ...prev,
      isBlocked: false,
      showModal: false,
      isRequired: false,
      lastCheck: new Date(),
      actionBlocked: undefined,
    }));
  }, []);

  // Handle modal close (only allowed for non-required verifications)
  const handleModalClose = useCallback(() => {
    if (!authState.isRequired) {
      setAuthState(prev => ({
        ...prev,
        showModal: false,
        actionBlocked: undefined,
      }));
    }
  }, [authState.isRequired]);

  // Periodic check for verification requirements (every 5 minutes)
  useEffect(() => {
    if (!isAdmin) return;

    const interval = setInterval(() => {
      const verificationNeeded = checkVerificationNeeded();
      if (verificationNeeded && !authState.showModal) {
        setAuthState(prev => ({
          ...prev,
          isBlocked: true,
          showModal: true,
          modalMode: 'verification',
          isRequired: true,
        }));
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => clearInterval(interval);
  }, [isAdmin, checkVerificationNeeded, authState.showModal]);

  return {
    // States
    isBlocked: authState.isBlocked,
    showModal: authState.showModal,
    isRequired: authState.isRequired,
    modalMode: authState.modalMode,
    actionBlocked: authState.actionBlocked,
    
    // Methods
    requireFacialAuth,
    handleAuthSuccess,
    handleModalClose,
    
    // Utilities
    isAdmin,
    facialAuthEnabled: isAdmin && facialState.isEnrolled,
  };
};