import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useMessages } from '@/hooks/useMessages';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Send, 
  Search, 
  Paperclip, 
  Mic, 
  Smile, 
  Phone,
  Video,
  MoreVertical,
  ArrowLeft,
  CheckCheck,
  Check
} from 'lucide-react';
import { ChatBubble } from './ChatBubble';
import { TypingIndicator } from './TypingIndicator';
import { ChatHeader } from './ChatHeader';
import { ConversationList } from './ConversationList';
import { MediaUploadModal } from './MediaUploadModal';
import { VoiceRecorder } from './VoiceRecorder';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

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
  avatar_url?: string;
}

export function ModernChatInterface() {
  const { job_id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // States
  const [job, setJob] = useState<Job | null>(null);
  const [otherUser, setOtherUser] = useState<Profile | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showConversations, setShowConversations] = useState(!job_id);
  
  // Messages hook
  const { messages, loading, sendMessage, markMessagesAsRead, unreadCount } = useMessages(job_id);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch job and user data
  useEffect(() => {
    if (!job_id || !user) return;

    const fetchJobData = async () => {
      try {
        const { data: jobData, error: jobError } = await supabase
          .from('jobs')
          .select('id, title, status, client_id, provider_id')
          .eq('id', job_id)
          .single();

        if (jobError) throw jobError;
        setJob(jobData);

        // Get other user (not current user)
        const otherUserId = jobData.client_id === user.id ? jobData.provider_id : jobData.client_id;
        
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .eq('user_id', otherUserId)
          .single();

        if (profileError) throw profileError;
        setOtherUser(profileData);
      } catch (error) {
        console.error('Error fetching job data:', error);
        toast.error('Erro ao carregar dados do chat');
      }
    };

    fetchJobData();
  }, [job_id, user]);

  // Handle send message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !job_id) return;

    try {
      await sendMessage(job_id, newMessage.trim());
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Erro ao enviar mensagem');
    }
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Check if user can send messages
  const canSendMessages = job && 
    (job.status === 'open' || job.status === 'in_progress' || job.status === 'pending_completion') &&
    (job.client_id === user?.id || job.provider_id === user?.id);

  // Mobile view: show conversations or chat
  const isMobile = window.innerWidth < 768;

  if (loading && !job) {
    return (
      <div className="flex h-screen">
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-gradient-to-br from-background/80 via-background to-background/80 backdrop-blur-xl">
      {/* Conversations Sidebar - Desktop only or mobile when no chat selected */}
      {(!isMobile || showConversations) && (
        <div className={`
          ${isMobile ? 'w-full' : 'w-80'} 
          border-r border-border/50 backdrop-blur-sm bg-card/30
          flex flex-col
        `}>
          <ConversationList 
            onSelectConversation={(jobId) => {
              navigate(`/chats/${jobId}`);
              if (isMobile) setShowConversations(false);
            }}
            selectedJobId={job_id}
          />
        </div>
      )}

      {/* Chat Area */}
      {job_id && (!isMobile || !showConversations) && (
        <div className="flex-1 flex flex-col bg-gradient-to-b from-card/20 to-card/10 backdrop-blur-sm">
          {/* Chat Header */}
          <ChatHeader 
            job={job}
            otherUser={otherUser}
            onBack={() => isMobile ? setShowConversations(true) : navigate('/chats')}
            onSearch={() => {/* TODO: Implement search */}}
            onCall={() => {/* TODO: Implement voice call */}}
            onVideoCall={() => {/* TODO: Implement video call */}}
            showBackButton={isMobile}
          />

          <Separator className="opacity-30" />

          {/* Messages Area */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((message, index) => (
                <ChatBubble
                  key={message.id}
                  message={message}
                  isOwn={message.sender_id === user?.id}
                  showAvatar={
                    index === 0 || 
                    messages[index - 1]?.sender_id !== message.sender_id
                  }
                />
              ))}
              
              {/* Typing Indicator */}
              {isTyping && (
                <TypingIndicator user={otherUser} />
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Message Input */}
          {canSendMessages ? (
            <div className="p-4 bg-card/20 backdrop-blur-sm border-t border-border/50">
              <div className="flex items-end gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowMediaModal(true)}
                  className="shrink-0 hover:bg-accent/50"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>

                <div className="flex-1 relative">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Digite sua mensagem..."
                    className="pr-20 bg-background/50 backdrop-blur-sm border-border/50 focus:bg-background/80 transition-all duration-200"
                    maxLength={1000}
                  />
                  
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="h-8 w-8 hover:bg-accent/50"
                    >
                      <Smile className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {newMessage.trim() ? (
                  <Button
                    onClick={handleSendMessage}
                    size="icon"
                    className="shrink-0 bg-primary hover:bg-primary/90 transition-all duration-200"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsRecording(!isRecording)}
                    className={`shrink-0 transition-all duration-200 ${
                      isRecording ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground' : 'hover:bg-accent/50'
                    }`}
                  >
                    <Mic className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 bg-muted/30 backdrop-blur-sm border-t border-border/50 text-center">
              <p className="text-sm text-muted-foreground">
                {job?.status === 'completed' 
                  ? 'Este trabalho foi concluído. Não é possível enviar mais mensagens.'
                  : 'Você não pode enviar mensagens neste chat no momento.'
                }
              </p>
            </div>
          )}
        </div>
      )}

      {/* Empty State - No chat selected */}
      {!job_id && !isMobile && (
        <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-card/10 to-transparent">
          <div className="text-center space-y-4 p-8">
            <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <Send className="w-12 h-12 text-primary/50" />
            </div>
            <h3 className="text-xl font-semibold">Selecione uma conversa</h3>
            <p className="text-muted-foreground">
              Escolha uma conversa da lista para começar a trocar mensagens
            </p>
          </div>
        </div>
      )}

      {/* Modals */}
      <MediaUploadModal 
        isOpen={showMediaModal}
        onClose={() => setShowMediaModal(false)}
        onUpload={(url, type) => {
          // TODO: Send media message
          setShowMediaModal(false);
        }}
      />

      <VoiceRecorder
        isRecording={isRecording}
        onStop={() => setIsRecording(false)}
        onSend={(audioUrl) => {
          // TODO: Send voice message
          setIsRecording(false);
        }}
      />
    </div>
  );
}