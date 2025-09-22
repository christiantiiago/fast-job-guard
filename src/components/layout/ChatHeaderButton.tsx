import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MessageCircle, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMessages } from '@/hooks/useMessages';

export function ChatHeaderButton() {
  const { unreadCount } = useMessages();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <MessageCircle className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 border-b">
          <h4 className="font-semibold">Conversas</h4>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} não lidas` : 'Nenhuma conversa nova'}
          </p>
        </div>
        
        <div className="p-4">
          {unreadCount === 0 ? (
            <div className="text-center py-6">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Nenhuma conversa ativa
              </p>
              <Button asChild variant="outline" size="sm" className="mt-2">
                <Link to="/chats">
                  Ver todas as conversas
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {/* This would be populated with actual conversations */}
              <Button asChild variant="ghost" className="w-full justify-start h-auto p-3">
                <Link to="/chats">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    <span className="text-sm">Ver todas as conversas</span>
                  </div>
                </Link>
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}