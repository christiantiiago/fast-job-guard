import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, MapPin, DollarSign, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatusCardProps {
  title: string;
  description?: string;
  status: "open" | "in_progress" | "delivered" | "completed" | "cancelled" | "disputed";
  price?: number;
  location?: string;
  timeAgo?: string;
  providerName?: string;
  onAction?: () => void;
  actionLabel?: string;
  className?: string;
}

const statusConfig = {
  open: {
    label: "Aberto",
    className: "status-open",
    bgColor: "bg-primary/5",
    borderColor: "border-primary/20"
  },
  in_progress: {
    label: "Em Andamento",
    className: "status-progress",
    bgColor: "bg-accent/5",
    borderColor: "border-accent/20"
  },
  delivered: {
    label: "Entregue",
    className: "status-progress",
    bgColor: "bg-accent/5",
    borderColor: "border-accent/20"
  },
  completed: {
    label: "Concluído",
    className: "status-completed",
    bgColor: "bg-secondary/5",
    borderColor: "border-secondary/20"
  },
  cancelled: {
    label: "Cancelado",
    className: "bg-destructive/10 text-destructive border border-destructive/20",
    bgColor: "bg-destructive/5",
    borderColor: "border-destructive/20"
  },
  disputed: {
    label: "Em Disputa",
    className: "bg-destructive/10 text-destructive border border-destructive/20",
    bgColor: "bg-destructive/5",
    borderColor: "border-destructive/20"
  }
};

const StatusCard = ({
  title,
  description,
  status,
  price,
  location,
  timeAgo,
  providerName,
  onAction,
  actionLabel,
  className
}: StatusCardProps) => {
  const config = statusConfig[status];

  return (
    <Card className={cn(
      "border-0 shadow-card hover:shadow-elevated transition-all duration-300 cursor-pointer",
      config.bgColor,
      config.borderColor,
      "border-l-4",
      className
    )}>
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="font-semibold text-foreground mb-1 line-clamp-2">
              {title}
            </h3>
            {description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {description}
              </p>
            )}
          </div>
          <Badge className={config.className}>
            {config.label}
          </Badge>
        </div>

        {/* Details */}
        <div className="space-y-2 mb-4">
          {price && (
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium text-foreground">
                R$ {price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}
          
          {location && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span className="truncate">{location}</span>
            </div>
          )}
          
          {providerName && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="w-4 h-4" />
              <span>Com {providerName}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          {timeAgo && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>{timeAgo}</span>
            </div>
          )}
          
          {onAction && actionLabel && (
            <Button 
              variant="modern" 
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onAction();
              }}
            >
              {actionLabel}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default StatusCard;