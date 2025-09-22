import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface JobMessage {
  id: string;
  job_id: string;
  sender_id: string;
  content: string;
  attachment_url?: string;
  attachment_type?: string;
  is_read: boolean;
  created_at: string;
  sender?: {
    user_id: string;
    full_name: string;
    avatar_url?: string;
  };
}

export const useMessages = (jobId?: string) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<JobMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  // Get total unread messages count across all conversations
  const fetchUnreadCount = useCallback(async () => {
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
  }, [user]);

  // Fetch messages for specific job
  const fetchMessages = useCallback(async () => {
    if (!jobId || !user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('job_messages')
        .select(`
          id,
          job_id,
          sender_id,
          content,
          attachment_url,
          attachment_type,
          is_read,
          created_at,
          sender:profiles!fk_job_messages_sender (
            user_id,
            full_name,
            avatar_url
          )
        `)
        .eq('job_id', jobId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const formattedMessages: JobMessage[] = (data || []).map(msg => ({
        id: msg.id,
        job_id: msg.job_id,
        sender_id: msg.sender_id,
        content: msg.content || '',
        attachment_url: msg.attachment_url,
        attachment_type: msg.attachment_type,
        is_read: msg.is_read,
        created_at: msg.created_at,
        sender: msg.sender
      }));

      setMessages(formattedMessages);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  }, [jobId, user]);

  // Mark messages as read
  const markMessagesAsRead = useCallback(async (targetJobId: string) => {
    if (!user) return;

    try {
      await supabase
        .from('job_messages')
        .update({ is_read: true })
        .eq('job_id', targetJobId)
        .neq('sender_id', user.id);

      // Refresh unread count
      fetchUnreadCount();
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }, [user, fetchUnreadCount]);

  // Send new message
  const sendMessage = useCallback(async (targetJobId: string, content: string, attachmentUrl?: string, attachmentType?: string) => {
    if (!user || !content.trim()) return;

    try {
      const { error } = await supabase
        .from('job_messages')
        .insert({
          job_id: targetJobId,
          sender_id: user.id,
          content: content.trim(),
          attachment_url: attachmentUrl,
          attachment_type: attachmentType,
          is_read: false
        });

      if (error) throw error;

      // Refresh messages and unread count
      await fetchMessages();
      await fetchUnreadCount();
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }, [user, fetchMessages, fetchUnreadCount]);

  // Initial data fetch
  useEffect(() => {
    fetchMessages();
    fetchUnreadCount();
  }, [fetchMessages, fetchUnreadCount]);

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
  }, [jobId, user, fetchMessages]);

  // Set up real-time subscription for unread count
  useEffect(() => {
    if (!user) return;

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
  }, [user, fetchUnreadCount]);

  // Auto-mark messages as read when component mounts with messages
  useEffect(() => {
    if (jobId && messages.length > 0 && user) {
      const hasUnreadMessages = messages.some(msg => !msg.is_read && msg.sender_id !== user.id);
      if (hasUnreadMessages) {
        markMessagesAsRead(jobId);
      }
    }
  }, [jobId, messages.length, user?.id]); // Note: removed markMessagesAsRead from deps to prevent loop

  return {
    messages,
    loading,
    unreadCount,
    sendMessage,
    markMessagesAsRead,
    refetch: fetchMessages
  };
};