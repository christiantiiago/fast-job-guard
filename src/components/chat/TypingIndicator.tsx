import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Profile {
  user_id: string;
  full_name: string;
  avatar_url?: string;
}

interface TypingIndicatorProps {
  user: Profile | null;
}

export function TypingIndicator({ user }: TypingIndicatorProps) {
  return (
    <div className="flex items-end gap-2">
      <Avatar className="w-8 h-8 shrink-0">
        <AvatarImage src={user?.avatar_url} />
        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-xs">
          {user?.full_name?.charAt(0) || 'U'}
        </AvatarFallback>
      </Avatar>
      
      <div className="bg-gradient-to-br from-card to-card/80 border border-border/50 px-4 py-3 rounded-2xl rounded-bl-md backdrop-blur-sm">
        <div className="flex items-center gap-1">
          <div className="flex gap-1">
            <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"></div>
          </div>
          <span className="text-xs text-muted-foreground ml-2">
            {user?.full_name || 'Usuário'} está digitando...
          </span>
        </div>
      </div>
    </div>
  );
}