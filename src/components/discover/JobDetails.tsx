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
  service_categories?: {
    name: string;
    color?: string;
    icon_name?: string;
  };
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
    <div className="absolute bottom-4 left-4 right-4 z-50 pointer-events-auto">
      <Card className="bg-white/98 backdrop-blur-md border-0 shadow-2xl"
            style={{ 
              position: 'sticky',
              zIndex: 1000
            }}>
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <h3 className="font-bold text-lg text-gray-900 leading-tight">{job.title}</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            >
              ×
            </Button>
          </div>
          
          <div className="flex items-center gap-2 mb-3">
            {getStatusBadge(job.status)}
            {job.proposal_count && job.proposal_count > 0 && (
              <Badge variant="secondary" className="bg-gradient-to-r from-red-500 to-red-600 text-white border-0">
                <MessageSquare className="w-3 h-3 mr-1" />
                {job.proposal_count} proposta(s)
              </Badge>
            )}
          </div>
          
          <p className="text-sm text-gray-600 mb-4 line-clamp-2 leading-relaxed">
            {job.description}
          </p>
          
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="font-bold text-xl text-gray-900">
                {formatCurrency(job.budget_min, job.budget_max, job.final_price)}
              </div>
              {(job.routeDistance || job.distance) && (
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center bg-blue-50 px-2 py-1 rounded-lg">
                    <MapPin className="w-3 h-3 mr-1 text-blue-600" />
                    <span className="font-medium">{formatDistance(job.routeDistance || job.distance || 0)}</span>
                  </div>
                  {job.routeDuration && job.routeDuration > 0 && (
                    <div className="flex items-center bg-green-50 px-2 py-1 rounded-lg">
                      <Clock className="w-3 h-3 mr-1 text-green-600" />
                      <span className="font-medium">{formatDuration(job.routeDuration)}</span>
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
                className="border-gray-300 hover:bg-gray-50"
              >
                <Eye className="w-4 h-4 mr-1" />
                Ver
              </Button>
              <Button
                size="sm"
                onClick={() => navigate(`/jobs/${job.id}`)}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 border-0"
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