import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface JobMessage {
  id: string;
  job_id: string;
  sender_id: string;
  content: string;
  attachment_url?: string;
  attachment_type?: string;
  has_attachments: boolean;
  is_read: boolean;
  created_at: string;
  sender_name: string;
  sender_avatar: string;
}

export const useMessages = (jobId?: string) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<JobMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  // Get total unread messages count across all conversations
  const fetchUnreadCount = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('job_messages')
        .select(`
          id,
          is_read,
          sender_id,
          job_id
        `)
        .eq('is_read', false)
        .neq('sender_id', user.id);

      if (error) throw error;

      // Get jobs where user is client or provider
      const { data: userJobs } = await supabase
        .from('jobs')
        .select('id')
        .or(`client_id.eq.${user.id},provider_id.eq.${user.id}`);

      const jobIds = userJobs?.map(job => job.id) || [];
      const userMessages = data?.filter(msg => jobIds.includes(msg.job_id)) || [];

      setUnreadCount(userMessages.length);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const fetchMessages = async () => {
    if (!jobId || !user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('job_messages')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Get sender profiles
      const senderIds = [...new Set(data?.map(msg => msg.sender_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', senderIds);

      const profilesMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      const formattedMessages: JobMessage[] = data?.map(msg => {
        const profile = profilesMap.get(msg.sender_id);
        return {
          id: msg.id,
          job_id: msg.job_id,
          sender_id: msg.sender_id,
          content: msg.content || '',
          attachment_url: msg.attachment_url,
          attachment_type: msg.attachment_type,
          has_attachments: msg.has_attachments || false,
          is_read: msg.is_read,
          created_at: msg.created_at,
          sender_name: profile?.full_name || 'Usuário',
          sender_avatar: profile?.avatar_url || ''
        };
      }) || [];

      setMessages(formattedMessages);

      // Mark messages as read for current user
      if (formattedMessages.length > 0) {
        await markMessagesAsRead(jobId);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const markMessagesAsRead = async (jobId: string) => {
    if (!user) return;

    try {
      await supabase
        .from('job_messages')
        .update({ is_read: true })
        .eq('job_id', jobId)
        .neq('sender_id', user.id);

      // Refresh unread count
      fetchUnreadCount();
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const sendMessage = async (jobId: string, content: string, attachmentUrl?: string, attachmentType?: string) => {
    if (!user || !content.trim()) return;

    try {
      const { error } = await supabase
        .from('job_messages')
        .insert({
          job_id: jobId,
          sender_id: user.id,
          content: content.trim(),
          attachment_url: attachmentUrl,
          attachment_type: attachmentType,
          has_attachments: !!attachmentUrl,
          is_read: false
        });

      if (error) throw error;

      // Refresh messages
      fetchMessages();
      fetchUnreadCount();
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  };

  // Set up real-time subscription for messages
  useEffect(() => {
    if (!jobId || !user) return;

    const channel = supabase
      .channel(`messages-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
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
  }, [jobId, user]);

  // Set up real-time subscription for unread count
  useEffect(() => {
    if (!user) return;

    fetchUnreadCount();

    const channel = supabase
      .channel('unread-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'job_messages'
        },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    fetchMessages();
  }, [jobId, user]);

  return {
    messages,
    loading,
    unreadCount,
    sendMessage,
    markMessagesAsRead,
    refetch: fetchMessages
  };
};