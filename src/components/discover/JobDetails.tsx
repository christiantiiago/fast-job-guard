import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, MessageSquare, MapPin, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface JobWithDistance {
  id: string;
  title: string;
  description: string;
  status: string;
  budget_min?: number;
  budget_max?: number;
  final_price?: number;
  distance?: number;
  proposal_count?: number;
  created_at: string;
  completed_at?: string;
  routeDistance?: number;
  routeDuration?: number;
}

interface JobDetailsProps {
  job: JobWithDistance;
  onClose: () => void;
  formatCurrency: (min?: number, max?: number, final?: number) => string;
  formatDistance: (distance: number) => string;
  formatDuration: (duration: number) => string;
  getStatusBadge: (status: string) => JSX.Element;
}

export function JobDetails({ job, onClose, formatCurrency, formatDistance, formatDuration, getStatusBadge }: JobDetailsProps) {
  const navigate = useNavigate();

  return (
    <div className="absolute bottom-4 left-4 right-4 z-10">
      <Card className="bg-white/95 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-semibold text-lg">{job.title}</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              ×
            </Button>
          </div>
          
          <div className="flex items-center gap-2 mb-2">
            {getStatusBadge(job.status)}
            {job.proposal_count && job.proposal_count > 0 && (
              <Badge variant="secondary" className="bg-red-100 text-red-800">
                <MessageSquare className="w-3 h-3 mr-1" />
                {job.proposal_count} proposta(s)
              </Badge>
            )}
          </div>
          
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {job.description}
          </p>
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="font-semibold text-lg text-primary">
                {formatCurrency(job.budget_min, job.budget_max, job.final_price)}
              </div>
              {(job.routeDistance || job.distance) && (
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center">
                    <MapPin className="w-3 h-3 mr-1" />
                    {formatDistance(job.routeDistance || job.distance || 0)}
                  </div>
                  {job.routeDuration && job.routeDuration > 0 && (
                    <div className="flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {formatDuration(job.routeDuration)}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/jobs/${job.id}`)}
              >
                <Eye className="w-4 h-4 mr-1" />
                Ver
              </Button>
              <Button
                size="sm"
                onClick={() => navigate(`/jobs/${job.id}`)}
              >
                <MessageSquare className="w-4 h-4 mr-1" />
                Propor
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}