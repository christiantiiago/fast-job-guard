import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
  MessageCircle
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
          .select('user_id, full_name')
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
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/jobs')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>

            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary text-primary-foreground">
                {otherUserProfile?.full_name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <h1 className="text-lg font-semibold">
                {otherUserProfile?.full_name || 'Usuário'}
              </h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{job.title}</span>
                {getStatusBadge(job.status)}
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <MessageCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhuma mensagem ainda</h3>
              <p className="text-muted-foreground">
                Seja o primeiro a enviar uma mensagem neste chat
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] p-3 rounded-lg ${
                    message.sender_id === user?.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                  <div className={`flex items-center gap-1 mt-2 text-xs ${
                    message.sender_id === user?.id 
                      ? 'text-primary-foreground/70' 
                      : 'text-muted-foreground'
                  }`}>
                    <Clock className="h-3 w-3" />
                    <span>
                      {new Date(message.created_at).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    {message.sender_id === user?.id && (
                      message.is_read ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <Circle className="h-3 w-3" />
                      )
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="p-6 border-t border-border">
          <div className="flex gap-2">
            <Input
              placeholder="Digite sua mensagem..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              disabled={sending || job.status === 'completed' || job.status === 'cancelled' || job.status === 'open'}
            />
            <Button 
              onClick={sendMessage}
              disabled={!newMessage.trim() || sending || job.status === 'completed' || job.status === 'cancelled' || job.status === 'open'}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          
          {job.status === 'open' ? (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              O chat será liberado após a contratação do prestador
            </p>
          ) : (job.status === 'completed' || job.status === 'cancelled') ? (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Este chat foi finalizado pois o trabalho está {job.status === 'completed' ? 'concluído' : 'cancelado'}
            </p>
          ) : null}
        </div>
      </div>
    </AppLayout>
  );
}