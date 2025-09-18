import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PasswordStrengthResult {
  score: number;
  strength: 'weak' | 'medium' | 'strong';
  issues: string[];
  is_secure: boolean;
}

export const usePasswordStrength = (password: string) => {
  const [result, setResult] = useState<PasswordStrengthResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const validatePassword = async () => {
      if (!password || password.length === 0) {
        setResult(null);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase.rpc('validate_password_strength', {
          password_text: password
        });

        if (error) {
          console.error('Password validation error:', error);
          setResult(null);
        } else {
          setResult(data as unknown as PasswordStrengthResult);
        }
      } catch (error) {
        console.error('Password validation failed:', error);
        setResult(null);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(validatePassword, 300);
    return () => clearTimeout(debounceTimer);
  }, [password]);

  const getStrengthColor = () => {
    if (!result) return 'text-muted-foreground';
    
    switch (result.strength) {
      case 'strong':
        return 'text-green-600';
      case 'medium':
        return 'text-yellow-600';
      case 'weak':
        return 'text-red-600';
      default:
        return 'text-muted-foreground';
    }
  };

  const getStrengthText = () => {
    if (!result) return '';
    
    switch (result.strength) {
      case 'strong':
        return 'Senha forte';
      case 'medium':
        return 'Senha média';
      case 'weak':
        return 'Senha fraca';
      default:
        return '';
    }
  };

  const getIssueText = (issue: string) => {
    const translations: Record<string, string> = {
      'minimum_8_characters': 'Pelo menos 8 caracteres',
      'uppercase_letter': 'Pelo menos uma letra maiúscula',
      'lowercase_letter': 'Pelo menos uma letra minúscula',
      'number': 'Pelo menos um número',
      'special_character': 'Pelo menos um caractere especial'
    };
    
    return translations[issue] || issue;
  };

  return {
    result,
    loading,
    getStrengthColor,
    getStrengthText,
    getIssueText,
    isSecure: result?.is_secure || false
  };
};