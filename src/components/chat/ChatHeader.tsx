import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Search, 
  Phone, 
  Video, 
  MoreVertical,
  Circle
} from 'lucide-react';

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

interface ChatHeaderProps {
  job: Job | null;
  otherUser: Profile | null;
  onBack: () => void;
  onSearch: () => void;
  onCall: () => void;
  onVideoCall: () => void;
  showBackButton?: boolean;
}

export function ChatHeader({ 
  job, 
  otherUser, 
  onBack, 
  onSearch, 
  onCall, 
  onVideoCall,
  showBackButton = false 
}: ChatHeaderProps) {
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

  const getStatusText = (status: string) => {
    switch (status) {
      case 'open':
        return 'Aberto';
      case 'in_progress':
        return 'Em Andamento';
      case 'pending_completion':
        return 'Aguardando Finalização';
      case 'completed':
        return 'Concluído';
      default:
        return status;
    }
  };

  return (
    <div className="p-4 bg-card/30 backdrop-blur-sm border-b border-border/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {showBackButton && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="shrink-0 hover:bg-accent/50"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          
          <Avatar className="w-10 h-10">
            <AvatarImage src={otherUser?.avatar_url} />
            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary">
              {otherUser?.full_name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-sm truncate">
                {otherUser?.full_name || 'Usuário'}
              </h2>
              <Circle className="w-2 h-2 fill-green-500 text-green-500" />
            </div>
            
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-muted-foreground truncate">
                {job?.title}
              </p>
              {job?.status && (
                <Badge 
                  variant="secondary" 
                  className={`text-xs px-2 py-0 ${getStatusColor(job.status)}`}
                >
                  {getStatusText(job.status)}
                </Badge>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onSearch}
            className="hover:bg-accent/50"
          >
            <Search className="w-4 h-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={onCall}
            className="hover:bg-accent/50"
          >
            <Phone className="w-4 h-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={onVideoCall}
            className="hover:bg-accent/50"
          >
            <Video className="w-4 h-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-accent/50"
          >
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}