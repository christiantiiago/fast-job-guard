import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface FraudAnalysisRequest {
  type: 'kyc_document' | 'job_posting' | 'user_behavior';
  data: any;
  metadata?: any;
}

interface FraudAnalysisResult {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  fraudIndicators: string[];
  recommendations: string[];
  aiAnalysis: string;
  requiresReview: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { type, data, metadata }: FraudAnalysisRequest = await req.json();

    console.log(`AI Fraud Detection request - Type: ${type}`);

    let analysisResult: FraudAnalysisResult;

    switch (type) {
      case 'kyc_document':
        analysisResult = await analyzeKYCDocument(data, metadata);
        break;
      case 'job_posting':
        analysisResult = await analyzeJobPosting(data, metadata);
        break;
      case 'user_behavior':
        analysisResult = await analyzeUserBehavior(data, metadata);
        break;
      default:
        throw new Error('Invalid analysis type');
    }

    // Store analysis result in database
    const { error: dbError } = await supabase
      .from('fraud_analysis_logs')
      .insert({
        type,
        entity_id: data.id || metadata?.entityId,
        risk_level: analysisResult.riskLevel,
        risk_score: analysisResult.riskScore,
        fraud_indicators: analysisResult.fraudIndicators,
        recommendations: analysisResult.recommendations,
        ai_analysis: analysisResult.aiAnalysis,
        requires_review: analysisResult.requiresReview,
        metadata: { ...metadata, originalData: data }
      });

    if (dbError) {
      console.error('Error storing fraud analysis:', dbError);
    }

    // Create alert if high risk
    if (analysisResult.riskLevel === 'high' || analysisResult.riskLevel === 'critical') {
      await createHighRiskAlert(supabase, type, data, analysisResult);
    }

    return new Response(JSON.stringify(analysisResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in AI fraud detection:', error);
    return new Response(JSON.stringify({ 
      error: 'Fraud analysis failed', 
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function analyzeKYCDocument(data: any, metadata: any): Promise<FraudAnalysisResult> {
  const prompt = `
  Analyze this KYC document for potential fraud indicators:
  
  Document Type: ${data.document_type}
  File Name: ${data.file_name}
  User ID: ${data.user_id}
  Upload Date: ${data.created_at}
  
  Previous Analysis: ${metadata?.previousAnalysis || 'None'}
  User History: ${metadata?.userHistory || 'No history available'}
  
  Please analyze for:
  1. Document authenticity indicators
  2. Potential manipulation signs
  3. Inconsistencies with user profile
  4. Suspicious timing patterns
  5. File metadata anomalies
  
  Provide a JSON response with:
  - riskLevel: low/medium/high/critical
  - riskScore: 0-100
  - fraudIndicators: array of specific concerns
  - recommendations: array of next steps
  - aiAnalysis: detailed explanation
  - requiresReview: boolean
  `;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-5-2025-08-07',
      messages: [
        { role: 'system', content: 'You are an expert fraud detection analyst specializing in KYC document verification. Respond only with valid JSON.' },
        { role: 'user', content: prompt }
      ],
      max_completion_tokens: 1000,
    }),
  });

  const result = await response.json();
  const aiResponse = result.choices[0].message.content;
  
  try {
    return JSON.parse(aiResponse);
  } catch (parseError) {
    // Fallback analysis if JSON parsing fails
    return {
      riskLevel: 'medium',
      riskScore: 50,
      fraudIndicators: ['AI analysis parsing failed'],
      recommendations: ['Manual review required'],
      aiAnalysis: aiResponse,
      requiresReview: true
    };
  }
}

async function analyzeJobPosting(data: any, metadata: any): Promise<FraudAnalysisResult> {
  const prompt = `
  Analyze this job posting for potential fraud or illegal activity:
  
  Title: ${data.title}
  Description: ${data.description}
  Category: ${metadata?.category || 'Unknown'}
  Budget: ${data.budget_min} - ${data.budget_max}
  Location: ${metadata?.location || 'Not specified'}
  Client History: ${metadata?.clientHistory || 'No history'}
  
  Check for:
  1. Illegal services or activities
  2. Scam patterns and red flags
  3. Inappropriate content
  4. Unrealistic pricing
  5. Vague or suspicious descriptions
  6. Money laundering indicators
  7. Adult/illegal content
  
  Provide JSON response with fraud assessment.
  `;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-5-2025-08-07',
      messages: [
        { role: 'system', content: 'You are an expert content moderator and fraud analyst. Flag illegal, inappropriate, or fraudulent job postings. Respond only with valid JSON.' },
        { role: 'user', content: prompt }
      ],
      max_completion_tokens: 1000,
    }),
  });

  const result = await response.json();
  const aiResponse = result.choices[0].message.content;
  
  try {
    return JSON.parse(aiResponse);
  } catch (parseError) {
    return {
      riskLevel: 'medium',
      riskScore: 50,
      fraudIndicators: ['AI analysis parsing failed'],
      recommendations: ['Manual review required'],
      aiAnalysis: aiResponse,
      requiresReview: true
    };
  }
}

async function analyzeUserBehavior(data: any, metadata: any): Promise<FraudAnalysisResult> {
  const prompt = `
  Analyze this user behavior pattern for fraud indicators:
  
  User ID: ${data.user_id}
  Login Patterns: ${data.loginPatterns || 'No data'}
  Job Activity: ${data.jobActivity || 'No data'}
  Payment History: ${data.paymentHistory || 'No data'}
  Location Changes: ${data.locationChanges || 'No data'}
  Device Information: ${data.deviceInfo || 'No data'}
  
  Analyze for:
  1. Account takeover signs
  2. Multiple account usage
  3. Suspicious location patterns
  4. Unusual activity spikes
  5. Bot-like behavior
  6. Payment fraud indicators
  
  Provide JSON fraud assessment.
  `;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-5-2025-08-07',
      messages: [
        { role: 'system', content: 'You are a cybersecurity expert specializing in user behavior analysis and fraud detection. Respond only with valid JSON.' },
        { role: 'user', content: prompt }
      ],
      max_completion_tokens: 1000,
    }),
  });

  const result = await response.json();
  const aiResponse = result.choices[0].message.content;
  
  try {
    return JSON.parse(aiResponse);
  } catch (parseError) {
    return {
      riskLevel: 'low',
      riskScore: 25,
      fraudIndicators: ['AI analysis parsing failed'],
      recommendations: ['Continue monitoring'],
      aiAnalysis: aiResponse,
      requiresReview: false
    };
  }
}

async function createHighRiskAlert(supabase: any, type: string, data: any, analysis: FraudAnalysisResult) {
  const alertTitle = `🚨 High Risk ${type === 'kyc_document' ? 'KYC Document' : type === 'job_posting' ? 'Job Posting' : 'User Behavior'} Detected`;
  const alertMessage = `Risk Level: ${analysis.riskLevel.toUpperCase()}\nScore: ${analysis.riskScore}/100\nIndicators: ${analysis.fraudIndicators.join(', ')}`;
  
  // Get all admin users
  const { data: adminUsers } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('role', 'admin');

  // Create notifications for all admins
  if (adminUsers) {
    const notifications = adminUsers.map(admin => ({
      user_id: admin.user_id,
      title: alertTitle,
      message: alertMessage,
      type: 'fraud_alert',
      data: {
        analysisType: type,
        entityId: data.id,
        riskLevel: analysis.riskLevel,
        riskScore: analysis.riskScore,
        fraudIndicators: analysis.fraudIndicators
      }
    }));

    await supabase
      .from('notifications')
      .insert(notifications);

    console.log(`Created ${notifications.length} fraud alert notifications`);
  }
}