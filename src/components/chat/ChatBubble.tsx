import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Check, CheckCheck } from 'lucide-react';

interface JobMessage {
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

interface ChatBubbleProps {
  message: JobMessage;
  isOwn: boolean;
  showAvatar: boolean;
}

export function ChatBubble({ message, isOwn, showAvatar }: ChatBubbleProps) {
  const formatTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { 
        addSuffix: true, 
        locale: ptBR 
      });
    } catch {
      return 'Agora';
    }
  };

  return (
    <div className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      {showAvatar && !isOwn && (
        <Avatar className="w-8 h-8 shrink-0">
          <AvatarImage src={message.sender?.avatar_url} />
          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-xs">
            {message.sender?.full_name?.charAt(0) || 'U'}
          </AvatarFallback>
        </Avatar>
      )}
      
      {/* Message bubble */}
      <div className={`
        max-w-[70%] group
        ${isOwn ? 'items-end' : 'items-start'}
      `}>
        {/* Sender name (only for other users) */}
        {showAvatar && !isOwn && (
          <p className="text-xs text-muted-foreground mb-1 px-3">
            {message.sender?.full_name}
          </p>
        )}
        
        {/* Message content */}
        <div className={`
          relative px-4 py-3 rounded-2xl backdrop-blur-sm transition-all duration-200
          ${isOwn 
            ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground ml-auto' 
            : 'bg-gradient-to-br from-card to-card/80 border border-border/50'
          }
          ${isOwn ? 'rounded-br-md' : 'rounded-bl-md'}
          group-hover:shadow-lg group-hover:scale-[1.02]
        `}>
          {/* Attachment preview */}
          {message.attachment_url && (
            <div className="mb-2">
              {message.attachment_type?.startsWith('image/') ? (
                <img 
                  src={message.attachment_url} 
                  alt="Anexo" 
                  className="max-w-full rounded-lg border border-border/30"
                  style={{ maxHeight: '200px' }}
                />
              ) : (
                <div className="flex items-center gap-2 p-2 bg-background/20 rounded-lg border border-border/30">
                  <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center">
                    📄
                  </div>
                  <span className="text-sm truncate">Anexo</span>
                </div>
              )}
            </div>
          )}
          
          {/* Text content */}
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {message.content}
          </p>
          
          {/* Message footer */}
          <div className={`
            flex items-center justify-end gap-1 mt-2 text-xs
            ${isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'}
          `}>
            <span>{formatTime(message.created_at)}</span>
            {isOwn && (
              <div className="flex items-center">
                {message.is_read ? (
                  <CheckCheck className="w-3 h-3" />
                ) : (
                  <Check className="w-3 h-3" />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Spacer for alignment */}
      {showAvatar && isOwn && <div className="w-8" />}
    </div>
  );
}