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
  Send, ArrowLeft, Clock, CheckCircle2, Circle, MessageCircle, User
} from 'lucide-react';
import { toast } from 'sonner';

interface JobMessage {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  is_read: boolean;
  typing?: boolean;
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
  const { user } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [messages, setMessages] = useState<JobMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [otherUserProfile, setOtherUserProfile] = useState<Profile | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

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

      if (jobData.client_id !== user?.id && jobData.provider_id !== user?.id) {
        toast.error('Você não tem acesso a este chat');
        navigate('/jobs');
        return;
      }

      setJob(jobData);

      const otherUserId = jobData.client_id === user?.id ? jobData.provider_id : jobData.client_id;
      if (otherUserId) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .eq('user_id', otherUserId)
          .single();
        if (profileData) setOtherUserProfile(profileData);
      }
    } catch (error) {
      console.error('Erro ao buscar job:', error);
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
      console.error('Erro ao buscar mensagens:', error);
      toast.error('Erro ao carregar mensagens');
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim() || !jobId || !user || sending) return;
    setSending(true);
    try {
      await supabase
        .from('job_messages')
        .insert({ job_id: jobId, sender_id: user.id, content: newMessage.trim() });
      setNewMessage('');
      await fetchMessages();
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
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
      console.error('Erro ao marcar como lidas:', error);
    }
  };

  // Typing indicator
  const sendTyping = async () => {
    if (!jobId || !user) return;
    try {
      await supabase
        .from('job_typing')
        .upsert({ job_id: jobId, user_id: user.id, typing: true });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(async () => {
        await supabase.from('job_typing').upsert({ job_id: jobId, user_id: user.id, typing: false });
      }, 2000);
    } catch (err) { console.error(err); }
  };

  // Setup real-time subscriptions
  useEffect(() => {
    if (!jobId) return;

    const messageChannel = supabase
      .channel(`job-messages-${jobId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'job_messages',
        filter: `job_id=eq.${jobId}`
      }, fetchMessages)
      .subscribe();

    const typingChannel = supabase
      .channel(`job-typing-${jobId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'job_typing',
        filter: `job_id=eq.${jobId}`
      }, async () => {
        const { data } = await supabase
          .from('job_typing')
          .select('*')
          .eq('job_id', jobId)
          .neq('user_id', user?.id)
          .single();
        setIsTyping(data?.typing || false);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(messageChannel);
      supabase.removeChannel(typingChannel);
    };
  }, [jobId, user?.id]);

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
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className={`h-16 ${i % 2 === 0 ? 'w-2/3' : 'w-1/2'} rounded-lg`} />
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
          <Button onClick={() => navigate('/jobs')}>Voltar para trabalhos</Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-80px)]">
        {/* Header */}
        <div className="p-6 border-b border-border flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/jobs')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Avatar className="h-10 w-10">
            <AvatarFallback>{otherUserProfile?.full_name?.charAt(0) || 'U'}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">{otherUserProfile?.full_name || 'Usuário'}</h1>
            <p className="text-sm text-muted-foreground">{job.title}</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-2">
          {messages.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <MessageCircle className="mx-auto h-12 w-12 mb-4" />
              Nenhuma mensagem ainda
            </div>
          )}
          {messages.map((msg) => {
            const isMe = msg.sender_id === user?.id;
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`p-3 rounded-lg max-w-[70%] ${isMe ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  <p className="text-sm">{msg.content}</p>
                  <div className="flex items-center gap-1 mt-1 text-xs">
                    <Clock className="h-3 w-3" />
                    <span>{new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                    {isMe && (msg.is_read ? ' vv' : ' v')}
                  </div>
                </div>
              </div>
            );
          })}
          {isTyping && (
            <div className="text-sm text-muted-foreground italic">O outro usuário está digitando...</div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-border flex gap-2">
          <Input
            placeholder="Digite sua mensagem..."
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              sendTyping();
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            disabled={sending || !['in_progress', 'open'].includes(job.status)}
          />
          <Button onClick={sendMessage} disabled={!newMessage.trim() || sending}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
