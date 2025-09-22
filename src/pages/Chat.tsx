import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { 
  Send, 
  ArrowLeft,
  Paperclip,
  Image as ImageIcon,
  Clock,
  CheckCircle2,
  Circle,
  MessageCircle,
  Phone,
  Video,
  MoreVertical,
  Smile
} from 'lucide-react';
import { toast } from 'sonner';

interface JobMessage {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  is_read: boolean;
  attachment_url?: string;
  attachment_type?: string;
}

interface Job {
  id: string;
  title: string;
  status: string;
  client_id: string;
  provider_id: string;
}

interface Profile {
  user_id: string;
  full_name?: string;
  avatar_url?: string;
}

export default function Chat() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [messages, setMessages] = useState<JobMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [otherUserProfile, setOtherUserProfile] = useState<Profile | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch job details and validate access
  const fetchJobDetails = async () => {
    if (!jobId) return;

    try {
      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (jobError) throw jobError;

      // Check if user is part of this job
      if (jobData.client_id !== user?.id && jobData.provider_id !== user?.id) {
        toast.error('Você não tem acesso a este chat');
        navigate('/jobs');
        return;
      }

      setJob(jobData);

      // Get other user's profile
      const otherUserId = jobData.client_id === user?.id ? jobData.provider_id : jobData.client_id;
      if (otherUserId) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .eq('user_id', otherUserId)
          .single();

        if (profileData) {
          setOtherUserProfile(profileData);
        }
      }
    } catch (error) {
      console.error('Error fetching job:', error);
      toast.error('Erro ao carregar dados do trabalho');
      navigate('/jobs');
    }
  };

  // Fetch messages
  const fetchMessages = async () => {
    if (!jobId) return;

    try {
      const { data, error } = await supabase
        .from('job_messages')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Erro ao carregar mensagens');
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim() || !jobId || !user || sending) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('job_messages')
        .insert({
          job_id: jobId,
          sender_id: user.id,
          content: newMessage.trim()
        });

      if (error) throw error;

      setNewMessage('');
      await fetchMessages();
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Erro ao enviar mensagem');
    } finally {
      setSending(false);
    }
  };

  // Mark messages as read
  const markMessagesAsRead = async () => {
    if (!jobId || !user) return;

    try {
      await supabase
        .from('job_messages')
        .update({ is_read: true })
        .eq('job_id', jobId)
        .neq('sender_id', user.id)
        .eq('is_read', false);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  // Setup real-time subscription
  useEffect(() => {
    if (!jobId) return;

    const channel = supabase
      .channel('job-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'job_messages',
          filter: `job_id=eq.${jobId}`
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchJobDetails();
      await fetchMessages();
      setLoading(false);
    };

    loadData();
  }, [jobId]);

  useEffect(() => {
    scrollToBottom();
    markMessagesAsRead();
  }, [messages]);

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6 space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                <Skeleton className={`h-20 ${i % 2 === 0 ? 'w-2/3' : 'w-1/2'}`} />
              </div>
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!job) {
    return (
      <AppLayout>
        <div className="p-6 text-center">
          <MessageCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Chat não encontrado</h3>
          <Button onClick={() => navigate('/jobs')}>
            Voltar para trabalhos
          </Button>
        </div>
      </AppLayout>
    );
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      'open': { color: 'bg-blue-100 text-blue-800', label: 'Aberto' },
      'in_progress': { color: 'bg-yellow-100 text-yellow-800', label: 'Em andamento' },
      'completed': { color: 'bg-green-100 text-green-800', label: 'Concluído' },
      'cancelled': { color: 'bg-red-100 text-red-800', label: 'Cancelado' }
    };

    const variant = variants[status as keyof typeof variants] || variants.open;
    return <Badge className={variant.color}>{variant.label}</Badge>;
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-80px)]">
        {/* Header - Instagram/WhatsApp Style */}
        <div className="bg-background border-b border-border sticky top-0 z-10">
          <div className="p-4">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate('/jobs')}
                className="h-9 w-9"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>

              <div className="flex items-center gap-3 flex-1">
                <div className="relative">
                  <Avatar className="h-10 w-10 border-2 border-primary/10">
                    {otherUserProfile?.avatar_url ? (
                      <AvatarImage 
                        src={otherUserProfile.avatar_url} 
                        alt={otherUserProfile?.full_name || 'Avatar'}
                        className="object-cover"
                      />
                    ) : (
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {otherUserProfile?.full_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-background rounded-full"></div>
                </div>

                <div className="flex-1 min-w-0">
                  <h1 className="text-sm font-semibold truncate">
                    {otherUserProfile?.full_name || 'Usuário'}
                  </h1>
                  <p className="text-xs text-muted-foreground truncate">
                    Online agora • {job.title}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Phone className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Video className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="mt-2">
              {getStatusBadge(job.status)}
            </div>
          </div>
        </div>

        {/* Messages - Instagram/WhatsApp Style */}
        <div className="flex-1 overflow-y-auto px-4 py-2" style={{ 
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)',
          backgroundSize: '20px 20px'
        }}>
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-muted/50 rounded-full p-6 w-24 h-24 mx-auto mb-4 flex items-center justify-center">
                <MessageCircle className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">Começe a conversa</h3>
              <p className="text-muted-foreground text-sm">
                Envie uma mensagem para {otherUserProfile?.full_name || 'o usuário'}
              </p>
            </div>
          ) : (
            <div className="space-y-1 py-4">
              {messages.map((message, index) => {
                const isMe = message.sender_id === user?.id;
                const showTime = index === 0 || 
                  (new Date(message.created_at).getTime() - new Date(messages[index - 1].created_at).getTime()) > 300000; // 5 minutes
                
                return (
                  <div key={message.id} className="space-y-1">
                    {showTime && (
                      <div className="flex justify-center">
                        <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
                          {new Date(message.created_at).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    )}
                    
                    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className="flex items-start gap-2 max-w-[80%]">
                        {!isMe && (
                          <Avatar className="h-6 w-6 mt-1">
                            {otherUserProfile?.avatar_url ? (
                              <AvatarImage 
                                src={otherUserProfile.avatar_url} 
                                alt={otherUserProfile?.full_name || 'Avatar'}
                                className="object-cover"
                              />
                            ) : (
                              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                {otherUserProfile?.full_name?.charAt(0) || 'U'}
                              </AvatarFallback>
                            )}
                          </Avatar>
                        )}
                        
                        <div
                          className={`relative px-4 py-2 rounded-2xl shadow-sm ${
                            isMe
                              ? 'bg-primary text-primary-foreground rounded-br-sm'
                              : 'bg-background border rounded-bl-sm'
                          }`}
                        >
                          <p className="text-sm leading-relaxed break-words">{message.content}</p>
                          <div className={`flex items-center justify-end gap-1 mt-1 text-xs ${
                            isMe 
                              ? 'text-primary-foreground/70' 
                              : 'text-muted-foreground'
                          }`}>
                            <span>
                              {new Date(message.created_at).toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                            {isMe && (
                              <div className="ml-1">
                                {message.is_read ? (
                                  <CheckCircle2 className="h-3 w-3 text-blue-400" />
                                ) : (
                                  <Circle className="h-3 w-3" />
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input - Instagram/WhatsApp Style */}
        <div className="bg-background border-t border-border p-4">
          <div className="flex items-end gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            
            <div className="flex-1 relative">
              <Input
                placeholder={`Mensagem para ${otherUserProfile?.full_name || 'usuário'}...`}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                disabled={sending || job.status === 'completed' || job.status === 'cancelled' || job.status === 'open'}
                className="rounded-full border-muted pr-12 focus:border-primary transition-colors"
              />
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute right-1 top-1 h-6 w-6 text-muted-foreground hover:text-foreground"
              >
                <Smile className="h-4 w-4" />
              </Button>
            </div>

            <Button 
              onClick={sendMessage}
              disabled={!newMessage.trim() || sending || job.status === 'completed' || job.status === 'cancelled' || job.status === 'open'}
              size="icon"
              className={`h-8 w-8 rounded-full transition-all ${
                newMessage.trim() 
                  ? 'bg-primary hover:bg-primary/90' 
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          
          {job.status === 'open' ? (
            <p className="text-xs text-muted-foreground mt-3 text-center flex items-center justify-center gap-1">
              <Circle className="h-3 w-3 fill-yellow-500 text-yellow-500" />
              O chat será liberado após a contratação do prestador
            </p>
          ) : (job.status === 'completed' || job.status === 'cancelled') ? (
            <p className="text-xs text-muted-foreground mt-3 text-center flex items-center justify-center gap-1">
              <Circle className="h-3 w-3 fill-red-500 text-red-500" />
              Chat finalizado - trabalho {job.status === 'completed' ? 'concluído' : 'cancelado'}
            </p>
          ) : null}
        </div>
      </div>
    </AppLayout>
  );
}