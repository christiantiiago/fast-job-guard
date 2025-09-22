import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { UserAvatar } from '@/components/ui/user-avatar';
import { useAuth } from '@/hooks/useAuth';
import { useMessages } from '@/hooks/useMessages';
import { supabase } from '@/integrations/supabase/client';
import { Send, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Job {
  id: string;
  title: string;
  status: string;
  client_id: string;
  provider_id: string;
}

interface Profile {
  user_id: string;
  full_name: string;
  avatar_url: string;
}

export function JobChatPage() {
  const { job_id } = useParams();
  const { user } = useAuth();
  const { messages, loading: messagesLoading, sendMessage, markMessagesAsRead } = useMessages(job_id);
  const [job, setJob] = useState<Job | null>(null);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (job_id) {
      fetchJobAndProfiles();
      markMessagesAsRead(job_id);
    }
  }, [job_id]);

  const fetchJobAndProfiles = async () => {
    if (!job_id) return;

    try {
      setLoading(true);
      
      // Fetch job details
      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .select('id, title, status, client_id, provider_id')
        .eq('id', job_id)
        .single();

      if (jobError) throw jobError;
      
      setJob(jobData);

      // Fetch profiles for client and provider
      const userIds = [jobData.client_id, jobData.provider_id].filter(Boolean);
      
      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', userIds);

        if (profilesError) throw profilesError;

        const profilesMap = (profilesData || []).reduce((acc, profile) => {
          acc[profile.user_id] = profile;
          return acc;
        }, {} as Record<string, Profile>);

        setProfiles(profilesMap);
      }
    } catch (error) {
      console.error('Error fetching job and profiles:', error);
      toast.error('Erro ao carregar dados do chat');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !job_id || sending) return;

    try {
      setSending(true);
      await sendMessage(job_id, newMessage.trim());
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Erro ao enviar mensagem');
    } finally {
      setSending(false);
    }
  };

  const canSendMessages = job && user && (
    job.client_id === user.id || job.provider_id === user.id
  ) && ['in_progress', 'completed', 'in_proposal'].includes(job.status);

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto py-8 px-4">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  if (!job) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto py-8 px-4">
          <Card>
            <CardContent className="text-center py-12">
              <MessageCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Trabalho não encontrado</h3>
              <p className="text-muted-foreground">
                O trabalho que você está procurando não existe ou você não tem permissão para acessá-lo.
              </p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto py-8 px-4">
        <Card className="h-[600px] flex flex-col">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  {job.title}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Chat entre cliente e prestador
                </p>
              </div>
              <Badge variant="secondary">
                {job.status === 'in_progress' ? 'Em Andamento' : 
                 job.status === 'completed' ? 'Concluído' : 
                 job.status === 'in_proposal' ? 'Em Proposta' : job.status}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col p-0">
            {/* Messages area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messagesLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  </div>
                ))
              ) : messages.length === 0 ? (
                <div className="text-center py-8">
                  <MessageCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nenhuma mensagem ainda</h3>
                  <p className="text-muted-foreground">
                    Inicie a conversa enviando a primeira mensagem.
                  </p>
                </div>
              ) : (
                messages.map((message) => {
                  const senderProfile = profiles[message.sender_id];
                  const isOwnMessage = message.sender_id === user?.id;
                  
                  return (
                    <div key={message.id} className={`flex items-start gap-3 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
                      <UserAvatar 
                        src={senderProfile?.avatar_url}
                        name={senderProfile?.full_name}
                        size="md"
                      />
                      <div className={`flex-1 max-w-[70%] ${isOwnMessage ? 'text-right' : ''}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">
                            {senderProfile?.full_name || 'Usuário'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(message.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                          </span>
                        </div>
                        <div className={`rounded-lg p-3 ${
                          isOwnMessage 
                            ? 'bg-primary text-primary-foreground ml-auto' 
                            : 'bg-muted'
                        }`}>
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Message input */}
            {canSendMessages && (
              <div className="border-t p-4">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Digite sua mensagem..."
                    disabled={sending}
                    className="flex-1"
                  />
                  <Button 
                    type="submit" 
                    disabled={!newMessage.trim() || sending}
                    size="sm"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            )}

            {!canSendMessages && (
              <div className="border-t p-4 bg-muted/50">
                <p className="text-sm text-muted-foreground text-center">
                  {job.status === 'open' ? 'O chat será liberado quando o trabalho estiver em andamento.' :
                   job.status === 'cancelled' ? 'Este trabalho foi cancelado.' :
                   'Você não pode enviar mensagens neste chat.'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}