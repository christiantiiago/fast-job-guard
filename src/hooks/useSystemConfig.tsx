import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SystemConfig {
  id: string;
  key: string;
  value: any;
  description: string;
  category: string;
  updated_at: string;
  updated_by?: string;
}

export interface ConfigCategory {
  name: string;
  icon: string;
  configs: SystemConfig[];
}

export const useSystemConfig = () => {
  const [configs, setConfigs] = useState<ConfigCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfigs = async () => {
    try {
      setLoading(true);

      // Get fee rules
      const { data: feeRules, error: feeError } = await supabase
        .from('fee_rules')
        .select('*')
        .eq('is_active', true)
        .single();

      if (feeError && feeError.code !== 'PGRST116') throw feeError;

      // Get service categories
      const { data: categories, error: categoriesError } = await supabase
        .from('service_categories')
        .select('*')
        .eq('is_active', true);

      if (categoriesError) throw categoriesError;

      // Mock system configurations (in a real app, these would be in a dedicated configs table)
      const mockConfigs: ConfigCategory[] = [
        {
          name: 'Configurações Financeiras',
          icon: 'DollarSign',
          configs: [
            {
              id: 'fee-client-standard',
              key: 'client_fee_standard',
              value: feeRules?.client_fee_standard || 5.0,
              description: 'Taxa padrão do cliente (%)',
              category: 'finance',
              updated_at: new Date().toISOString()
            },
            {
              id: 'fee-provider-standard',
              key: 'provider_fee_standard',
              value: feeRules?.provider_fee_standard || 5.0,
              description: 'Taxa padrão do prestador (%)',
              category: 'finance',
              updated_at: new Date().toISOString()
            },
            {
              id: 'fee-client-premium',
              key: 'client_fee_premium',
              value: feeRules?.client_fee_premium || 3.5,
              description: 'Taxa premium do cliente (%)',
              category: 'finance',
              updated_at: new Date().toISOString()
            },
            {
              id: 'fee-provider-premium',
              key: 'provider_fee_premium',
              value: feeRules?.provider_fee_premium || 3.5,
              description: 'Taxa premium do prestador (%)',
              category: 'finance',
              updated_at: new Date().toISOString()
            }
          ]
        },
        {
          name: 'Configurações de Segurança',
          icon: 'Shield',
          configs: [
            {
              id: 'session-timeout',
              key: 'session_timeout',
              value: 30,
              description: 'Timeout da sessão (minutos)',
              category: 'security',
              updated_at: new Date().toISOString()
            },
            {
              id: 'max-login-attempts',
              key: 'max_login_attempts',
              value: 5,
              description: 'Máximo de tentativas de login',
              category: 'security',
              updated_at: new Date().toISOString()
            },
            {
              id: 'facial-auth-frequency',
              key: 'facial_auth_frequency',
              value: 15,
              description: 'Frequência de autenticação facial (minutos)',
              category: 'security',
              updated_at: new Date().toISOString()
            },
            {
              id: 'two-factor-required',
              key: 'two_factor_required',
              value: false,
              description: '2FA obrigatório para admins',
              category: 'security',
              updated_at: new Date().toISOString()
            }
          ]
        },
        {
          name: 'Configurações KYC',
          icon: 'FileCheck',
          configs: [
            {
              id: 'auto-approve-threshold',
              key: 'auto_approve_threshold',
              value: 95,
              description: 'Limite para aprovação automática (%)',
              category: 'kyc',
              updated_at: new Date().toISOString()
            },
            {
              id: 'kyc-timeout',
              key: 'kyc_timeout',
              value: 7,
              description: 'Prazo para completar KYC (dias)',
              category: 'kyc',
              updated_at: new Date().toISOString()
            },
            {
              id: 'document-retention',
              key: 'document_retention',
              value: 365,
              description: 'Tempo de retenção de documentos (dias)',
              category: 'kyc',
              updated_at: new Date().toISOString()
            }
          ]
        },
        {
          name: 'Configurações de Notificação',
          icon: 'Bell',
          configs: [
            {
              id: 'email-notifications',
              key: 'email_notifications',
              value: true,
              description: 'Notificações por email habilitadas',
              category: 'notifications',
              updated_at: new Date().toISOString()
            },
            {
              id: 'push-notifications',
              key: 'push_notifications',
              value: true,
              description: 'Notificações push habilitadas',
              category: 'notifications',
              updated_at: new Date().toISOString()
            },
            {
              id: 'notification-frequency',
              key: 'notification_frequency',
              value: 'real-time',
              description: 'Frequência de notificações',
              category: 'notifications',
              updated_at: new Date().toISOString()
            }
          ]
        },
        {
          name: 'Categorias de Serviço',
          icon: 'Grid',
          configs: categories?.map(cat => ({
            id: cat.id,
            key: `category_${cat.slug}`,
            value: cat.is_active,
            description: `Categoria: ${cat.name}`,
            category: 'services',
            updated_at: cat.created_at
          })) || []
        }
      ];

      setConfigs(mockConfigs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = async (configId: string, newValue: any) => {
    try {
      const currentUser = await supabase.auth.getUser();

      // Update fee rules if it's a financial config
      if (configId.startsWith('fee-')) {
        const field = configId.replace('fee-', '').replace('-', '_');
        const { error } = await supabase
          .from('fee_rules')
          .update({ [field]: newValue })
          .eq('is_active', true);

        if (error) throw error;
      }

      // Update category if it's a service config
      if (configId.startsWith('category_')) {
        const categoryId = configId.replace('category_', '');
        const { error } = await supabase
          .from('service_categories')
          .update({ is_active: newValue })
          .eq('id', categoryId);

        if (error) throw error;
      }

      // Create audit log
      await supabase
        .from('audit_logs')
        .insert({
          user_id: currentUser.data.user?.id,
          action: 'config_update',
          entity_type: 'system_config',
          entity_id: configId,
          old_values: { config_id: configId },
          new_values: { config_id: configId, value: newValue },
          metadata: { config_type: configId.split('-')[0] }
        });

      await fetchConfigs();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erro ao atualizar configuração');
    }
  };

  const createCategory = async (categoryData: {
    name: string;
    slug: string;
    description?: string;
    icon_name?: string;
    color?: string;
  }) => {
    try {
      const { error } = await supabase
        .from('service_categories')
        .insert(categoryData);

      if (error) throw error;

      // Create audit log
      const currentUser = await supabase.auth.getUser();
      await supabase
        .from('audit_logs')
        .insert({
          user_id: currentUser.data.user?.id,
          action: 'category_create',
          entity_type: 'service_category',
          new_values: categoryData,
          metadata: { category_name: categoryData.name }
        });

      await fetchConfigs();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erro ao criar categoria');
    }
  };

  const exportConfigs = async () => {
    try {
      const configsData = JSON.stringify(configs, null, 2);
      const blob = new Blob([configsData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `system-configs-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Create audit log
      const currentUser = await supabase.auth.getUser();
      await supabase
        .from('audit_logs')
        .insert({
          user_id: currentUser.data.user?.id,
          action: 'config_export',
          entity_type: 'system_config',
          metadata: { export_date: new Date().toISOString() }
        });

    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erro ao exportar configurações');
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  return {
    configs,
    loading,
    error,
    refetch: fetchConfigs,
    updateConfig,
    createCategory,
    exportConfigs
  };
};