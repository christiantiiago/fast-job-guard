import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, MapPin } from 'lucide-react';

interface JobCardProps {
  title: string;
  subtitle?: string;
  description?: string;
  location?: string;
  badge?: string;
  color?: 'red' | 'green' | 'blue' | 'orange';
  image?: string;
  onAction?: () => void;
  buttonText?: string;
}

export function JobCard({ 
  title, 
  subtitle, 
  description, 
  location, 
  badge, 
  color = 'red',
  image,
  onAction,
  buttonText
}: JobCardProps) {
  const getColorClasses = () => {
    switch (color) {
      case 'green':
        return 'from-green-500 to-green-600';
      case 'blue':
        return 'from-blue-500 to-blue-600';
      case 'orange':
        return 'from-orange-500 to-orange-600';
      default:
        return 'from-red-500 to-red-600';
    }
  };

  return (
    <Card className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
      <div className={`bg-gradient-to-br ${getColorClasses()} p-4 text-white relative min-h-[140px] flex flex-col justify-between`}>
        {/* Background pattern */}
        {image && (
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30"
            style={{ backgroundImage: `url(${image})` }}
          />
        )}
        
        <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-10 translate-x-10" />
        <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/10 rounded-full translate-y-8 -translate-x-8" />
        
        <div className="relative z-10">
          {badge && (
            <Badge className="mb-2 bg-white/20 text-white hover:bg-white/25 border-0 text-xs">
              {badge}
            </Badge>
          )}
          
          <h3 className="text-lg font-bold mb-1">{title}</h3>
          {subtitle && (
            <p className="text-white/90 text-sm font-medium mb-1">{subtitle}</p>
          )}
          {description && (
            <p className="text-white/80 text-xs mb-2">{description}</p>
          )}
        </div>
        
        <div className="relative z-10 flex items-end justify-between">
          {location && (
            <div className="flex items-center gap-1 text-white/90">
              <MapPin className="w-3 h-3" />
              <span className="text-xs">{location}</span>
            </div>
          )}
          
          {buttonText && (
            <Button 
              size="sm"
              variant="ghost"
              onClick={onAction}
              className="text-white hover:bg-white/20 p-2 h-auto"
            >
              <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}