import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useRealTimeActivity } from '@/hooks/useRealTimeActivity';
import { 
  Activity, 
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  FileText,
  Shield,
  RefreshCw,
  Eye,
  Calendar,
  MapPin,
  Smartphone,
  Globe
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const RealTimeActivityFeed = () => {
  const { events, loading, error, trackActivity } = useRealTimeActivity(50);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);

  const getActivityIcon = (eventType: string) => {
    const iconMap: Record<string, any> = {
      'user_login': CheckCircle,
      'user_logout': Activity,
      'profile_update': User,
      'kyc_upload': FileText,
      'kyc_approve': CheckCircle,
      'kyc_reject': AlertTriangle,
      'facial_verification': Shield,
      'job_created': FileText,
      'proposal_submitted': Activity,
      'contract_signed': CheckCircle,
      'suspicious_activity': AlertTriangle,
    };
    return iconMap[eventType] || Activity;
  };

  const getActivityColor = (eventType: string, isSuspicious: boolean = false) => {
    if (isSuspicious) return 'text-red-600 bg-red-100';
    
    const colorMap: Record<string, string> = {
      'user_login': 'text-green-600 bg-green-100',
      'kyc_approve': 'text-green-600 bg-green-100',
      'kyc_reject': 'text-red-600 bg-red-100',
      'facial_verification': 'text-purple-600 bg-purple-100',
      'job_created': 'text-blue-600 bg-blue-100',
      'contract_signed': 'text-green-600 bg-green-100',
      'suspicious_activity': 'text-red-600 bg-red-100',
    };
    return colorMap[eventType] || 'text-gray-600 bg-gray-100';
  };

  const getRiskBadge = (riskScore: number) => {
    if (riskScore >= 70) {
      return <Badge variant="destructive" className="text-xs">Alto Risco</Badge>;
    } else if (riskScore >= 40) {
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 text-xs">Médio Risco</Badge>;
    } else if (riskScore > 0) {
      return <Badge variant="secondary" className="text-xs">Baixo Risco</Badge>;
    }
    return null;
  };

  const formatEventDescription = (event: any) => {
    const descriptions: Record<string, string> = {
      'user_login': 'Fez login na plataforma',
      'user_logout': 'Saiu da plataforma',
      'profile_update': 'Atualizou o perfil',
      'kyc_upload': 'Enviou documento KYC',
      'kyc_approve': 'Documento KYC aprovado',
      'kyc_reject': 'Documento KYC rejeitado',
      'facial_verification': 'Realizou verificação facial',
      'job_created': 'Criou um novo trabalho',
      'proposal_submitted': 'Enviou uma proposta',
      'contract_signed': 'Assinou um contrato',
      'suspicious_activity': 'Atividade suspeita detectada',
    };
    return descriptions[event.event_type] || `Ação: ${event.event_type}`;
  };

  const toggleExpanded = (eventId: string) => {
    setExpandedEvent(expandedEvent === eventId ? null : eventId);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-muted rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p>Erro ao carregar atividades: {error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Atividades em Tempo Real
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {events.length} eventos
            </Badge>
            <Button variant="ghost" size="sm">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">Nenhuma atividade recente</h3>
            <p>As atividades dos usuários aparecerão aqui em tempo real</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {events.map((event) => {
              const Icon = getActivityIcon(event.event_type);
              const isExpanded = expandedEvent === event.id;
              
              return (
                <div 
                  key={event.id} 
                  className={`p-4 border rounded-lg transition-all duration-200 ${
                    event.is_suspicious ? 'border-red-200 bg-red-50' : 'border-border hover:border-primary/20'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-full ${getActivityColor(event.event_type, event.is_suspicious)}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm">
                          {formatEventDescription(event)}
                        </p>
                        {getRiskBadge(event.risk_score)}
                        {event.is_suspicious && (
                          <Badge variant="destructive" className="text-xs">
                            Suspeito
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          Usuario ID: {event.user_id?.slice(0, 8)}...
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDistanceToNow(new Date(event.created_at), { 
                            addSuffix: true, 
                            locale: ptBR 
                          })}
                        </div>
                        {event.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {event.location}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleExpanded(event.id)}
                          className="text-xs h-auto py-1 px-2"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          {isExpanded ? 'Ocultar' : 'Ver detalhes'}
                        </Button>
                        
                        {event.entity_type && (
                          <Badge variant="outline" className="text-xs">
                            {event.entity_type}
                          </Badge>
                        )}
                      </div>

                      {/* Detalhes expandidos */}
                      {isExpanded && (
                        <div className="mt-3 p-3 bg-muted/50 rounded-lg space-y-2 text-xs">
                          {event.ip_address && (
                            <div className="flex items-center gap-2">
                              <Globe className="h-3 w-3 text-muted-foreground" />
                              <span className="font-medium">IP:</span>
                              <span>{event.ip_address}</span>
                            </div>
                          )}
                          
                          {event.user_agent && (
                            <div className="flex items-center gap-2">
                              <Smartphone className="h-3 w-3 text-muted-foreground" />
                              <span className="font-medium">User Agent:</span>
                              <span className="truncate">{event.user_agent}</span>
                            </div>
                          )}
                          
                          {event.entity_id && (
                            <div className="flex items-center gap-2">
                              <FileText className="h-3 w-3 text-muted-foreground" />
                              <span className="font-medium">Entity ID:</span>
                              <span className="font-mono">{event.entity_id}</span>
                            </div>
                          )}
                          
                          {event.metadata && Object.keys(event.metadata).length > 0 && (
                            <div>
                              <div className="font-medium mb-1 flex items-center gap-1">
                                <Activity className="h-3 w-3 text-muted-foreground" />
                                Metadados:
                              </div>
                              <pre className="bg-background p-2 rounded text-xs overflow-x-auto">
                                {JSON.stringify(event.metadata, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};