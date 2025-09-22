import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { UserAvatar } from '@/components/ui/user-avatar';
import { MessageCircle, Search, Clock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Conversation {
  job_id: string;
  job_title: string;
  other_user_id: string;
  other_user_name: string;
  other_user_avatar: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
  job_status: string;
  is_client: boolean;
}

export default function Chats() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  const fetchConversations = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Get all jobs where user is either client or provider and has messages
      const { data: jobsData, error } = await supabase
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

      if (error) throw error;

      if (!jobsData || jobsData.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      // Get messages for these jobs
      const jobIds = jobsData.map(job => job.id);
      const { data: messagesData } = await supabase
        .from('job_messages')
        .select('*')
        .in('job_id', jobIds)
        .order('created_at', { ascending: false });

      // Get profiles for all users
      const allUserIds = [
        ...jobsData.map(job => job.client_id),
        ...jobsData.map(job => job.provider_id)
      ].filter((id, index, arr) => id && arr.indexOf(id) === index);

      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', allUserIds);

      const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);

      // Transform data into conversations
      const conversationsData: Conversation[] = [];

      jobsData?.forEach(job => {
        if (!job.client_id || !job.provider_id) return;
        
        const jobMessages = messagesData?.filter(msg => msg.job_id === job.id) || [];
        if (jobMessages.length === 0) return;

        const isClient = job.client_id === user.id;
        const otherUserId = isClient ? job.provider_id : job.client_id;
        const otherUserProfile = profilesMap.get(otherUserId);
        
        if (!otherUserProfile) return;

        // Get last message
        const lastMessage = jobMessages[0]; // Already ordered by created_at desc

        // Count unread messages (messages from other user that current user hasn't read)
        const unreadCount = jobMessages.filter(msg => 
          msg.sender_id !== user.id && !msg.is_read
        ).length;

        conversationsData.push({
          job_id: job.id,
          job_title: job.title,
          other_user_id: otherUserId,
          other_user_name: otherUserProfile.full_name || 'Usuário',
          other_user_avatar: otherUserProfile.avatar_url || '',
          last_message: lastMessage.content || '',
          last_message_at: lastMessage.created_at,
          unread_count: unreadCount,
          job_status: job.status,
          is_client: isClient
        });
      });

      // Sort by last message date
      conversationsData.sort((a, b) => 
        new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
      );

      setConversations(conversationsData);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.job_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.other_user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.last_message.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-500';
      case 'in_progress': return 'bg-orange-500';
      case 'completed': return 'bg-green-500';
      case 'cancelled': return 'bg-gray-500';
      default: return 'bg-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'open': return 'Aberto';
      case 'in_progress': return 'Em andamento';
      case 'completed': return 'Concluído';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="container-center py-8">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container-center py-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <MessageCircle className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Conversas</h1>
          </div>
          {conversations.length > 0 && (
            <Badge variant="secondary" className="text-sm">
              {conversations.reduce((sum, conv) => sum + conv.unread_count, 0)} não lidas
            </Badge>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conversas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Conversations List */}
        {filteredConversations.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MessageCircle className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {searchQuery ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa ainda'}
              </h3>
              <p className="text-muted-foreground text-center">
                {searchQuery 
                  ? 'Tente um termo diferente para buscar' 
                  : 'As conversas aparecerão aqui quando você começar a trabalhar com outros usuários'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredConversations.map((conversation) => (
              <Card
                key={`${conversation.job_id}-${conversation.other_user_id}`}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/chat/${conversation.job_id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <UserAvatar 
                      src={conversation.other_user_avatar}
                      name={conversation.other_user_name}
                      size="xl"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-sm text-muted-foreground truncate">
                          {conversation.job_title}
                        </h3>
                        <Badge 
                          variant="secondary" 
                          className={`text-xs text-white ${getStatusColor(conversation.job_status)}`}
                        >
                          {getStatusText(conversation.job_status)}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium">{conversation.other_user_name}</span>
                        <span className="text-sm text-muted-foreground">
                          {conversation.is_client ? '(Prestador)' : '(Cliente)'}
                        </span>
                      </div>

                      <p className="text-sm text-muted-foreground truncate">
                        {conversation.last_message}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(conversation.last_message_at), {
                          addSuffix: true,
                          locale: ptBR
                        })}
                      </div>

                      {conversation.unread_count > 0 && (
                        <Badge 
                          variant="destructive" 
                          className="h-5 w-5 p-0 flex items-center justify-center text-xs"
                        >
                          {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}