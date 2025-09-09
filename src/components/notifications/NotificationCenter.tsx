import { useState, useEffect, useRef } from 'react';
import { Bell, X, Trash2, AlertCircle, Info, Star, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useRealTimeNotifications } from '@/hooks/useRealTimeNotifications';
import { ProposalApprovalCard } from './ProposalApprovalCard';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export const NotificationCenter = () => {
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification
  } = useRealTimeNotifications();
  const [isOpen, setIsOpen] = useState(false);

  const getPriorityIcon = (priority: number) => {
    switch (priority) {
      case 4: return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 3: return <Zap className="h-4 w-4 text-orange-500" />;
      case 2: return <Star className="h-4 w-4 text-blue-500" />;
      default: return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days}d atrás`;
    if (hours > 0) return `${hours}h atrás`;
    if (minutes > 0) return `${minutes}m atrás`;
    return 'Agora mesmo';
  };

  const getNotificationTypeColor = (type: string) => {
    const colors = {
      'job_proposal': 'bg-blue-100 text-blue-800',
      'payment_released': 'bg-green-100 text-green-800',
      'job_completed': 'bg-purple-100 text-purple-800',
      'proposal_accepted': 'bg-emerald-100 text-emerald-800',
      'proposal_rejected': 'bg-red-100 text-red-800',
      'content_violation': 'bg-orange-100 text-orange-800',
      'system': 'bg-gray-100 text-gray-800'
    };
    return colors[type as keyof typeof colors] || colors.system;
  };

  return (
    <div className="fixed top-4 right-4 z-50">
      <Button 
        variant="ghost" 
        size="icon" 
        className="relative"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <div className="absolute top-12 right-0 w-80 max-h-96 overflow-hidden">
          <Card className="border shadow-lg">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Notificações</CardTitle>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={markAllAsRead}
                      className="text-xs"
                    >
                      Marcar todas
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsOpen(false)}
                    className="h-6 w-6"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <Separator />
            
            <CardContent className="p-0">
              {loading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Carregando notificações...
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Nenhuma notificação
                </div>
              ) : (
                <ScrollArea className="h-80">
                  <div className="space-y-1">
                    {notifications.map((notification) => 
                      notification.type === 'proposal_accepted_for_approval' ? (
                        <div key={notification.id} className="p-3">
                          <ProposalApprovalCard 
                            data={notification.data as any}
                            onClose={() => {
                              markAsRead(notification.id);
                              deleteNotification(notification.id);
                              setIsOpen(false);
                            }}
                          />
                        </div>
                      ) : (
                        <Card key={notification.id} className={cn(
                          "m-2 transition-colors hover:bg-muted/50",
                          !notification.is_read && "border-l-4 border-l-primary"
                        )}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium text-sm">{notification.title}</h4>
                                  {!notification.is_read && (
                                    <Badge variant="secondary" className="h-5 px-2 text-xs">
                                      Nova
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(notification.created_at), { 
                                    addSuffix: true,
                                    locale: ptBR 
                                  })}
                                </p>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deleteNotification(notification.id)}
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    )}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};