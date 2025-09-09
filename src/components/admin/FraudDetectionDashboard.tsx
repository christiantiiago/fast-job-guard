import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useJobFraudDetection } from '@/hooks/useJobFraudDetection';
import { useToast } from '@/hooks/use-toast';
import { 
  AlertTriangle, 
  Shield, 
  Eye, 
  Bot,
  TrendingUp,
  Users,
  Briefcase,
  CheckCircle,
  XCircle,
  Clock,
  Brain
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

export const FraudDetectionDashboard = () => {
  const { suspiciousJobs, stats, loading, updateJobStatus, runAIAnalysis } = useJobFraudDetection();
  const { toast } = useToast();
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [processingAI, setProcessingAI] = useState<string | null>(null);

  const handleStatusUpdate = async (jobId: string, status: any, notes?: string) => {
    try {
      await updateJobStatus(jobId, status, notes);
      toast({
        title: 'Status atualizado',
        description: `Job ${status === 'approved' ? 'aprovado' : status === 'rejected' ? 'rejeitado' : 'atualizado'} com sucesso.`,
      });
      setSelectedJob(null);
      setAdminNotes('');
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar status do job.',
        variant: 'destructive',
      });
    }
  };

  const handleAIAnalysis = async (jobId: string) => {
    try {
      setProcessingAI(jobId);
      await runAIAnalysis(jobId);
      toast({
        title: 'Análise IA concluída',
        description: 'O job foi analisado pela IA com sucesso.',
      });
    } catch (error) {
      toast({
        title: 'Erro na análise IA',
        description: 'Erro ao processar análise com IA.',
        variant: 'destructive',
      });
    } finally {
      setProcessingAI(null);
    }
  };

  const getRiskBadge = (riskScore: number) => {
    if (riskScore >= 90) return <Badge variant="destructive">Crítico ({riskScore})</Badge>;
    if (riskScore >= 70) return <Badge variant="destructive">Alto ({riskScore})</Badge>;
    if (riskScore >= 50) return <Badge className="bg-orange-100 text-orange-800">Médio ({riskScore})</Badge>;
    return <Badge className="bg-yellow-100 text-yellow-800">Baixo ({riskScore})</Badge>;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'flagged':
        return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Sinalizado</Badge>;
      case 'under_review':
        return <Badge className="bg-orange-100 text-orange-800"><Clock className="w-3 h-3 mr-1" />Em Análise</Badge>;
      case 'approved':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Aprovado</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejeitado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(value);
  };

  const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e'];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-8 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sinalizados</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.totalFlagged}</div>
            <p className="text-xs text-muted-foreground">
              {stats.flaggedToday} hoje
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Análise</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.underReview}</div>
            <p className="text-xs text-muted-foreground">
              Aguardando revisão
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Padrões Detectados</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.topPatterns.length}</div>
            <p className="text-xs text-muted-foreground">
              Indicadores de fraude
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Precisão</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">94.2%</div>
            <p className="text-xs text-muted-foreground">
              Detecção de fraudes
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="suspicious" className="space-y-4">
        <TabsList>
          <TabsTrigger value="suspicious">Jobs Suspeitos ({suspiciousJobs.length})</TabsTrigger>
          <TabsTrigger value="patterns">Padrões de Fraude</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="suspicious" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Jobs com Indicadores de Fraude
              </CardTitle>
              <CardDescription>
                Jobs que foram sinalizados pelo sistema de detecção de fraudes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {suspiciousJobs.slice(0, 10).map((job) => (
                  <div key={job.id} className="flex items-center gap-4 p-4 border rounded-lg">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium truncate">{job.title}</h3>
                        {getRiskBadge(job.risk_score)}
                        {getStatusBadge(job.status)}
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                        {job.description}
                      </p>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Cliente: {job.client_name}</span>
                        <span>•</span>
                        <span>Categoria: {job.category_name}</span>
                        <span>•</span>
                        <span>
                          Orçamento: {job.budget_min && job.budget_max 
                            ? `${formatCurrency(job.budget_min)} - ${formatCurrency(job.budget_max)}`
                            : 'Não informado'
                          }
                        </span>
                      </div>
                      
                      <div className="mt-2">
                        <p className="text-xs font-medium text-red-600">
                          Indicadores: {job.fraud_indicators.slice(0, 3).join(', ')}
                          {job.fraud_indicators.length > 3 && ` (+${job.fraud_indicators.length - 3} mais)`}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAIAnalysis(job.id)}
                        disabled={processingAI === job.id}
                      >
                        {processingAI === job.id ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary mr-1"></div>
                            IA
                          </>
                        ) : (
                          <>
                            <Brain className="h-3 w-3 mr-1" />
                            Analisar IA
                          </>
                        )}
                      </Button>

                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedJob(job)}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Revisar
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl">
                          <DialogHeader>
                            <DialogTitle>Revisão de Job Suspeito</DialogTitle>
                            <DialogDescription>
                              Analise os detalhes e tome uma decisão sobre este job
                            </DialogDescription>
                          </DialogHeader>
                          
                          {selectedJob && (
                            <div className="space-y-6">
                              <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                  <h4 className="font-medium mb-2">Informações do Job</h4>
                                  <div className="space-y-2 text-sm">
                                    <p><strong>Título:</strong> {selectedJob.title}</p>
                                    <p><strong>Cliente:</strong> {selectedJob.client_name}</p>
                                    <p><strong>Categoria:</strong> {selectedJob.category_name}</p>
                                    <p><strong>Orçamento:</strong> {
                                      selectedJob.budget_min && selectedJob.budget_max
                                        ? `${formatCurrency(selectedJob.budget_min)} - ${formatCurrency(selectedJob.budget_max)}`
                                        : 'Não informado'
                                    }</p>
                                    <div className="flex items-center gap-2">
                                      <strong>Score de Risco:</strong>
                                      {getRiskBadge(selectedJob.risk_score)}
                                    </div>
                                  </div>
                                </div>

                                <div>
                                  <h4 className="font-medium mb-2">Indicadores de Fraude</h4>
                                  <div className="space-y-1">
                                    {selectedJob.fraud_indicators.map((indicator: string, idx: number) => (
                                      <div key={idx} className="flex items-center gap-2 text-sm">
                                        <AlertTriangle className="h-3 w-3 text-red-500" />
                                        <span>{indicator}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              <div>
                                <h4 className="font-medium mb-2">Descrição Completa</h4>
                                <div className="p-3 bg-gray-50 rounded border text-sm">
                                  {selectedJob.description}
                                </div>
                              </div>

                              {selectedJob.ai_analysis && (
                                <div>
                                  <h4 className="font-medium mb-2 flex items-center gap-2">
                                    <Bot className="h-4 w-4" />
                                    Análise da IA
                                  </h4>
                                  <div className="p-3 bg-blue-50 rounded border text-sm">
                                    {selectedJob.ai_analysis}
                                  </div>
                                </div>
                              )}

                              <div>
                                <h4 className="font-medium mb-2">Observações do Admin</h4>
                                <Textarea
                                  value={adminNotes}
                                  onChange={(e) => setAdminNotes(e.target.value)}
                                  placeholder="Adicione suas observações sobre esta análise..."
                                  rows={3}
                                />
                              </div>

                              <div className="flex gap-2 justify-end">
                                <Button
                                  variant="destructive"
                                  onClick={() => handleStatusUpdate(selectedJob.id, 'rejected', adminNotes)}
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Rejeitar Job
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => handleStatusUpdate(selectedJob.id, 'under_review', adminNotes)}
                                >
                                  <Clock className="h-4 w-4 mr-2" />
                                  Manter em Análise
                                </Button>
                                <Button
                                  onClick={() => handleStatusUpdate(selectedJob.id, 'approved', adminNotes)}
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Aprovar Job
                                </Button>
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                ))}

                {suspiciousJobs.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Shield className="mx-auto h-8 w-8 mb-2 opacity-50" />
                    <p>Nenhum job suspeito detectado</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patterns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Padrões de Fraude Mais Comuns</CardTitle>
              <CardDescription>
                Indicadores de fraude mais frequentemente detectados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.topPatterns.slice(0, 10).map((pattern, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex-1">
                      <p className="font-medium">{pattern.pattern}</p>
                      <p className="text-sm text-muted-foreground">
                        Detectado em {pattern.count} jobs
                      </p>
                    </div>
                    <Badge 
                      variant={
                        pattern.risk_level === 'high' ? 'destructive' :
                        pattern.risk_level === 'medium' ? 'secondary' : 'outline'
                      }
                    >
                      {pattern.risk_level === 'high' ? 'Alto Risco' :
                       pattern.risk_level === 'medium' ? 'Médio Risco' : 'Baixo Risco'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Distribuição de Risco</CardTitle>
                <CardDescription>Jobs por nível de risco detectado</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={stats.riskDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ risk_level, count }: any) => `${risk_level}: ${count}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {stats.riskDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Padrões de Fraude</CardTitle>
                <CardDescription>Indicadores mais frequentes</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={stats.topPatterns.slice(0, 5)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="pattern" 
                      tick={false}
                      axisLine={false}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(pattern) => `Padrão: ${pattern}`}
                      formatter={(value) => [value, 'Ocorrências']}
                    />
                    <Bar dataKey="count" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};