import { useState, useEffect } from 'react';
import { Clock, Calendar, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface EscrowCountdownProps {
  releaseDate: string;
  status: string;
}

export function EscrowCountdown({ releaseDate, status }: EscrowCountdownProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (status !== 'held') {
      setTimeRemaining('');
      return;
    }

    const updateCountdown = () => {
      const releaseDateTime = new Date(releaseDate);
      const now = new Date();
      const timeDiff = releaseDateTime.getTime() - now.getTime();

      if (timeDiff <= 0) {
        setTimeRemaining('Liberação disponível');
        setIsExpired(true);
        return;
      }

      const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeRemaining(`${days}d ${hours}h ${minutes}m`);
      } else if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m`);
      } else {
        setTimeRemaining(`${minutes}m`);
      }

      setIsExpired(false);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [releaseDate, status]);

  if (status !== 'held') return null;

  return (
    <div className="flex items-center gap-2 text-sm">
      {isExpired ? (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Liberação Disponível
        </Badge>
      ) : (
        <Badge variant="outline" className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {timeRemaining}
        </Badge>
      )}
    </div>
  );
}