import { AlertTriangle, Mail, Phone } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const KYCBlockedMessage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-xl font-bold text-red-600">
            Conta Temporariamente Suspensa
          </CardTitle>
          <CardDescription>
            Sua conta foi suspensa para análise de segurança
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Acesso Bloqueado</AlertTitle>
            <AlertDescription>
              Sua conta foi suspensa devido a problemas na verificação de identidade ou atividade suspeita.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <h3 className="font-medium">O que aconteceu?</h3>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                Nossa equipe de segurança identificou questões que precisam ser resolvidas antes que você possa continuar usando a plataforma.
              </p>
              <p>
                Isso pode incluir:
              </p>
              <ul className="list-disc list-inside ml-2 space-y-1">
                <li>Documentos ilegíveis ou suspeitos</li>
                <li>Informações inconsistentes</li>
                <li>Atividade não usual na conta</li>
                <li>Violação dos termos de uso</li>
              </ul>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-medium">Como resolver?</h3>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                Entre em contato com nossa equipe de suporte para resolver esta situação:
              </p>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start" asChild>
                  <a href="mailto:suporte@jobfast.com.br">
                    <Mail className="h-4 w-4 mr-2" />
                    suporte@jobfast.com.br
                  </a>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <a href="tel:+5511999999999">
                    <Phone className="h-4 w-4 mr-2" />
                    (11) 99999-9999
                  </a>
                </Button>
              </div>
            </div>
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Importante:</strong> Não crie uma nova conta. Isso pode resultar em banimento permanente.
              Entre em contato conosco para resolver a situação da sua conta atual.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};