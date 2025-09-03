import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SuspiciousJob {
  id: string;
  title: string;
  description: string;
  client_id: string;
  client_name?: string;
  budget_min?: number;
  budget_max?: number;
  category_name?: string;
  created_at: string;
  risk_score: number;
  fraud_indicators: string[];
  ai_analysis?: string;
  status: 'flagged' | 'under_review' | 'approved' | 'rejected';
  admin_notes?: string;
}

export interface FraudPattern {
  pattern: string;
  count: number;
  risk_level: 'low' | 'medium' | 'high';
  examples: string[];
}

export interface JobFraudStats {
  totalFlagged: number;
  flaggedToday: number;
  underReview: number;
  falsePositives: number;
  topPatterns: FraudPattern[];
  riskDistribution: { risk_level: string; count: number }[];
}

const SUSPICIOUS_KEYWORDS = [
  // Illegal activities
  'drogas', 'entorpecentes', 'maconha', 'cocaína', 'tráfico',
  'armas', 'munição', 'explosivos', 'contrabando',
  'prostituição', 'escort', 'acompanhante', 'massagem tântrica',
  'lavagem de dinheiro', 'sonegação', 'elisão fiscal',
  'documentos falsos', 'identidade falsa', 'cpf falso',
  
  // Scam patterns
  'ganhe dinheiro fácil', 'sem experiência necessária', 'trabalhe em casa',
  'renda extra garantida', 'dinheiro rápido', 'investimento garantido',
  'pirâmide', 'esquema ponzi', 'marketing multinível',
  'western union', 'moneygram', 'transferência internacional',
  
  // Adult content
  'conteúdo adulto', 'material pornográfico', 'webcam', 'onlyfans',
  'sugar daddy', 'sugar baby', 'relacionamento íntimo',
  
  // Financial fraud
  'cartão clonado', 'conta bancária', 'empréstimo sem consulta',
  'score baixo', 'nome sujo', 'cpf negativado',
  'bitcoin', 'criptomoeda', 'investimento em crypto'
];

const SUSPICIOUS_PATTERNS = [
  /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/, // CPF pattern
  /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/, // CNPJ pattern
  /\b\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b/, // Credit card pattern
  /whatsapp:?\s*\+?[\d\s\(\)-]{10,}/i, // WhatsApp numbers
  /telegram:?\s*@\w+/i, // Telegram handles
  /pix:?\s*[\w\.-]+@[\w\.-]+/i, // PIX keys
];

export const useJobFraudDetection = () => {
  const [suspiciousJobs, setSuspiciousJobs] = useState<SuspiciousJob[]>([]);
  const [stats, setStats] = useState<JobFraudStats>({
    totalFlagged: 0,
    flaggedToday: 0,
    underReview: 0,
    falsePositives: 0,
    topPatterns: [],
    riskDistribution: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const analyzeJobForFraud = useCallback((job: any): { riskScore: number; indicators: string[] } => {
    let riskScore = 0;
    const indicators: string[] = [];

    const text = `${job.title} ${job.description}`.toLowerCase();

    // Check for suspicious keywords
    SUSPICIOUS_KEYWORDS.forEach(keyword => {
      if (text.includes(keyword.toLowerCase())) {
        riskScore += 20;
        indicators.push(`Palavra suspeita detectada: "${keyword}"`);
      }
    });

    // Check for suspicious patterns
    SUSPICIOUS_PATTERNS.forEach((pattern, index) => {
      if (pattern.test(text)) {
        riskScore += 15;
        const patternNames = ['CPF', 'CNPJ', 'Cartão de Crédito', 'WhatsApp', 'Telegram', 'PIX'];
        indicators.push(`Padrão suspeito: ${patternNames[index] || 'Dado sensível'}`);
      }
    });

    // Check budget anomalies
    if (job.budget_min && job.budget_max) {
      const ratio = job.budget_max / job.budget_min;
      if (ratio > 10) {
        riskScore += 10;
        indicators.push('Faixa de orçamento muito ampla');
      }
    }

    // Check for extremely high or low budgets
    if (job.budget_min && (job.budget_min > 50000 || job.budget_min < 10)) {
      riskScore += 15;
      indicators.push(job.budget_min > 50000 ? 'Orçamento suspeito (muito alto)' : 'Orçamento suspeito (muito baixo)');
    }

    // Check text quality and length
    if (job.description.length < 50) {
      riskScore += 10;
      indicators.push('Descrição muito curta');
    }

    if (job.description.length > 2000) {
      riskScore += 5;
      indicators.push('Descrição excessivamente longa');
    }

    // Check for excessive caps
    const capsRatio = (job.description.match(/[A-Z]/g) || []).length / job.description.length;
    if (capsRatio > 0.3) {
      riskScore += 10;
      indicators.push('Uso excessivo de maiúsculas');
    }

    // Check for urgency keywords
    const urgencyKeywords = ['urgente', 'imediato', 'hoje', 'agora', 'rápido'];
    urgencyKeywords.forEach(keyword => {
      if (text.includes(keyword)) {
        riskScore += 5;
        indicators.push('Linguagem de urgência detectada');
      }
    });

    // Check for contact information in description
    const contactPatterns = [
      /\b\d{10,11}\b/, // Phone numbers
      /[\w\.-]+@[\w\.-]+\.\w+/, // Email addresses
      /@\w+/, // Social media handles
    ];

    contactPatterns.forEach(pattern => {
      if (pattern.test(text)) {
        riskScore += 10;
        indicators.push('Informações de contato na descrição');
      }
    });

    return {
      riskScore: Math.min(riskScore, 100),
      indicators: [...new Set(indicators)] // Remove duplicates
    };
  }, []);

  const fetchSuspiciousJobs = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch all jobs for analysis
      const { data: jobs, error: jobsError } = await supabase
        .from('jobs')
        .select(`
          *,
          profiles!jobs_client_id_fkey (
            full_name,
            user_id
          ),
          service_categories (
            name
          )
        `)
        .neq('status', 'draft')
        .order('created_at', { ascending: false });

      if (jobsError) throw jobsError;

      // Analyze each job for fraud indicators
      const analyzedJobs: SuspiciousJob[] = (jobs || [])
        .map(job => {
          const analysis = analyzeJobForFraud(job);
          
          return {
            id: job.id,
            title: job.title,
            description: job.description,
            client_id: job.client_id,
            client_name: job.profiles?.full_name || 'Unknown Client',
            budget_min: job.budget_min,
            budget_max: job.budget_max,
            category_name: job.service_categories?.name || 'Unknown Category',
            created_at: job.created_at,
            risk_score: analysis.riskScore,
            fraud_indicators: analysis.indicators,
            status: analysis.riskScore >= 70 ? 'flagged' : 
                   analysis.riskScore >= 40 ? 'under_review' : 'approved',
            admin_notes: ''
          };
        })
        .filter(job => job.risk_score >= 30) // Only show jobs with some risk
        .sort((a, b) => b.risk_score - a.risk_score);

      setSuspiciousJobs(analyzedJobs);
      await calculateStats(analyzedJobs);

    } catch (err) {
      console.error('Error fetching jobs for fraud analysis:', err);
      setError(err instanceof Error ? err.message : 'Failed to analyze jobs');
    } finally {
      setLoading(false);
    }
  }, [analyzeJobForFraud]);

  const calculateStats = async (jobs: SuspiciousJob[]) => {
    const today = new Date().toISOString().split('T')[0];
    
    const totalFlagged = jobs.filter(j => j.status === 'flagged').length;
    const flaggedToday = jobs.filter(j => 
      j.status === 'flagged' && j.created_at.startsWith(today)
    ).length;
    const underReview = jobs.filter(j => j.status === 'under_review').length;
    
    // Calculate pattern frequency
    const patternCounts: Record<string, number> = {};
    jobs.forEach(job => {
      job.fraud_indicators.forEach(indicator => {
        patternCounts[indicator] = (patternCounts[indicator] || 0) + 1;
      });
    });

    const topPatterns: FraudPattern[] = Object.entries(patternCounts)
      .map(([pattern, count]) => ({
        pattern,
        count,
        risk_level: count > 10 ? 'high' : count > 5 ? 'medium' : 'low',
        examples: jobs
          .filter(j => j.fraud_indicators.includes(pattern))
          .slice(0, 3)
          .map(j => j.title)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Risk distribution
    const riskDistribution = [
      { risk_level: 'Low (30-49)', count: jobs.filter(j => j.risk_score >= 30 && j.risk_score < 50).length },
      { risk_level: 'Medium (50-69)', count: jobs.filter(j => j.risk_score >= 50 && j.risk_score < 70).length },
      { risk_level: 'High (70-89)', count: jobs.filter(j => j.risk_score >= 70 && j.risk_score < 90).length },
      { risk_level: 'Critical (90+)', count: jobs.filter(j => j.risk_score >= 90).length }
    ];

    setStats({
      totalFlagged,
      flaggedToday,
      underReview,
      falsePositives: 0, // Would need historical data
      topPatterns,
      riskDistribution
    });
  };

  const updateJobStatus = async (jobId: string, status: SuspiciousJob['status'], notes?: string) => {
    try {
      // In a real implementation, you'd store this in a fraud_analysis table
      // For now, we'll update local state
      setSuspiciousJobs(prev =>
        prev.map(job =>
          job.id === jobId
            ? { ...job, status, admin_notes: notes }
            : job
        )
      );

      // Create audit log
      await supabase
        .from('audit_logs')
        .insert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
          action: `job_fraud_${status}`,
          entity_type: 'job',
          entity_id: jobId,
          metadata: { status, notes }
        });

    } catch (error) {
      console.error('Error updating job status:', error);
      throw error;
    }
  };

  const runAIAnalysis = async (jobId: string) => {
    try {
      const job = suspiciousJobs.find(j => j.id === jobId);
      if (!job) return;

      // Call AI fraud detection function
      const { data, error } = await supabase.functions.invoke('ai-fraud-detector', {
        body: {
          type: 'job_posting',
          data: job,
          metadata: {
            category: job.category_name,
            clientHistory: 'Basic client info', // Would fetch real data
            location: 'Brazil' // Would get from job location
          }
        }
      });

      if (error) throw error;

      // Update job with AI analysis
      setSuspiciousJobs(prev =>
        prev.map(j =>
          j.id === jobId
            ? {
                ...j,
                ai_analysis: data.aiAnalysis,
                risk_score: data.riskScore,
                fraud_indicators: [...j.fraud_indicators, ...data.fraudIndicators],
                status: data.riskLevel === 'critical' || data.riskLevel === 'high' ? 'flagged' : j.status
              }
            : j
        )
      );

    } catch (error) {
      console.error('Error running AI analysis:', error);
      throw error;
    }
  };

  useEffect(() => {
    fetchSuspiciousJobs();

    // Set up real-time subscription for new jobs
    const channel = supabase
      .channel('job-fraud-detection')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'jobs' },
        () => {
          fetchSuspiciousJobs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSuspiciousJobs]);

  return {
    suspiciousJobs,
    stats,
    loading,
    error,
    refetch: fetchSuspiciousJobs,
    updateJobStatus,
    runAIAnalysis
  };
};