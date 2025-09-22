import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, MessageCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Conversation {
  job_id: string;
  job_title: string;
  job_status: string;
  other_user: {
    user_id: string;
    full_name: string;
    avatar_url?: string;
  };
  last_message: {
    content: string;
    created_at: string;
    sender_id: string;
  } | null;
  unread_count: number;
}

interface ConversationListProps {
  onSelectConversation: (jobId: string) => void;
  selectedJobId?: string;
}

export function ConversationList({ onSelectConversation, selectedJobId }: ConversationListProps) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchConversations = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);

      // Buscar jobs onde o usuário é cliente ou prestador
      const { data: jobs, error: jobsError } = await supabase
        .from('jobs')
        .select(`
          id,
          title,
          status,
          client_id,
          provider_id
        `)
        .or(`client_id.eq.${user.id},provider_id.eq.${user.id}`)
        .order('updated_at', { ascending: false });

      if (jobsError) throw jobsError;

      if (!jobs || jobs.length === 0) {
        setConversations([]);
        return;
      }

      const conversationsData: Conversation[] = [];

      for (const job of jobs) {
        // Determinar o outro usuário
        const otherUserId = job.client_id === user.id ? job.provider_id : job.client_id;
        
        // Buscar dados do outro usuário
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .eq('user_id', otherUserId)
          .single();

        // Buscar última mensagem
        const { data: lastMessage } = await supabase
          .from('job_messages')
          .select('content, created_at, sender_id')
          .eq('job_id', job.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        // Contar mensagens não lidas
        const { count: unreadCount } = await supabase
          .from('job_messages')
          .select('*', { count: 'exact' })
          .eq('job_id', job.id)
          .eq('is_read', false)
          .neq('sender_id', user.id);

        conversationsData.push({
          job_id: job.id,
          job_title: job.title,
          job_status: job.status,
          other_user: profile || {
            user_id: otherUserId,
            full_name: 'Usuário Desconhecido'
          },
          last_message: lastMessage,
          unread_count: unreadCount || 0
        });
      }

      // Ordenar por última mensagem ou data de criação do job
      conversationsData.sort((a, b) => {
        const aTime = a.last_message?.created_at || '1970-01-01';
        const bTime = b.last_message?.created_at || '1970-01-01';
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });

      setConversations(conversationsData);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const filteredConversations = conversations.filter(conv =>
    conv.job_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.other_user.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { 
        addSuffix: true, 
        locale: ptBR 
      });
    } catch {
      return '';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-green-500/20 text-green-700 dark:text-green-300';
      case 'in_progress':
        return 'bg-blue-500/20 text-blue-700 dark:text-blue-300';
      case 'pending_completion':
        return 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300';
      case 'completed':
        return 'bg-gray-500/20 text-gray-700 dark:text-gray-300';
      default:
        return 'bg-gray-500/20 text-gray-700 dark:text-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-border/50">
          <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Conversas
          </h1>
        </div>
        
        <div className="p-4 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="w-12 h-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border/50">
        <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent mb-4">
          Conversas
        </h1>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conversas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-background/50 backdrop-blur-sm border-border/50"
          />
        </div>
      </div>

      {/* Conversations */}
      <ScrollArea className="flex-1">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <MessageCircle className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-medium text-muted-foreground mb-2">
              {searchQuery ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa ainda'}
            </h3>
            <p className="text-sm text-muted-foreground/70">
              {searchQuery 
                ? 'Tente buscar por outro termo'
                : 'Suas conversas aparecerão aqui quando você começar a trocar mensagens'
              }
            </p>
          </div>
        ) : (
          <div className="p-2">
            {filteredConversations.map((conversation) => (
              <div
                key={conversation.job_id}
                onClick={() => onSelectConversation(conversation.job_id)}
                className={`
                  p-3 rounded-lg cursor-pointer transition-all duration-200 mb-1
                  hover:bg-accent/50 hover:backdrop-blur-sm
                  ${selectedJobId === conversation.job_id 
                    ? 'bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20' 
                    : 'hover:bg-card/50'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={conversation.other_user.avatar_url} />
                      <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary">
                        {conversation.other_user.full_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    {conversation.unread_count > 0 && (
                      <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-xs bg-primary">
                        {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium text-sm truncate">
                        {conversation.other_user.full_name}
                      </h3>
                      {conversation.last_message && (
                        <span className="text-xs text-muted-foreground shrink-0">
                          {formatTime(conversation.last_message.created_at)}
                        </span>
                      )}
                    </div>
                    
                    <p className="text-xs text-muted-foreground truncate mb-2">
                      {conversation.job_title}
                    </p>
                    
                    {conversation.last_message && (
                      <p className="text-xs text-muted-foreground truncate">
                        {conversation.last_message.sender_id === user?.id ? 'Você: ' : ''}
                        {conversation.last_message.content}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}