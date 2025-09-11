// src/screens/Chat/ConversationsPage.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Trash, Archive } from 'lucide-react';
import { toast } from 'sonner';

interface Conversation {
  job_id: string;
  other_user_id: string;
  other_user_name: string;
  last_message: string;
  last_message_at: string;
}

export default function ConversationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = async () => {
    if (!user) return;
    try {
      const { data: jobs } = await supabase
        .from('jobs')
        .select('*')
        .or(`client_id.eq.${user.id},provider_id.eq.${user.id}`)
        .order('updated_at', { ascending: false });

      const convs: Conversation[] = [];

      for (const job of jobs) {
        const otherUserId = job.client_id === user.id ? job.provider_id : job.client_id;
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', otherUserId)
          .single();

        const { data: lastMsg } = await supabase
          .from('job_messages')
          .select('*')
          .eq('job_id', job.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        convs.push({
          job_id: job.id,
          other_user_id: otherUserId,
          other_user_name: profile?.full_name || 'Usuário',
          last_message: lastMsg?.content || 'Nenhuma mensagem',
          last_message_at: lastMsg?.created_at || job.updated_at,
        });
      }

      setConversations(convs);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar conversas');
    } finally {
      setLoading(false);
    }
  };

  const deleteConversation = async (jobId: string) => {
    try {
      await supabase.from('job_messages').delete().eq('job_id', jobId);
      toast.success('Conversa deletada');
      fetchConversations();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao deletar conversa');
    }
  };

  const archiveConversation = async (jobId: string) => {
    try {
      await supabase.from('jobs').update({ archived: true }).eq('id', jobId);
      toast.success('Conversa arquivada');
      fetchConversations();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao arquivar conversa');
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [user]);

  if (loading) return <AppLayout><p className="p-6">Carregando...</p></AppLayout>;

  if (conversations.length === 0)
    return (
      <AppLayout>
        <p className="p-6 text-center">Nenhuma conversa encontrada</p>
      </AppLayout>
    );

  return (
    <AppLayout>
      <div className="p-6 space-y-4">
        {conversations.map((conv) => (
          <Card key={conv.job_id} className="flex items-center justify-between p-4">
            <div
              className="flex items-center gap-4 cursor-pointer"
              onClick={() => navigate(`/chat/${conv.job_id}`)}
            >
              <Avatar className="h-10 w-10">
                <AvatarFallback>{conv.other_user_name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{conv.other_user_name}</p>
                <p className="text-sm text-muted-foreground truncate">{conv.last_message}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => archiveConversation(conv.job_id)}
              >
                <Archive className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteConversation(conv.job_id)}
              >
                <Trash className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </AppLayout>
  );
}
