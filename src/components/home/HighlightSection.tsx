import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LucideIcon } from 'lucide-react';

interface HighlightItem {
  id: string;
  title: string;
  icon: LucideIcon;
  isNew?: boolean;
  color?: 'primary' | 'secondary' | 'accent';
}

interface HighlightSectionProps {
  title: string;
  items: HighlightItem[];
  onItemClick?: (item: HighlightItem) => void;
}

export function HighlightSection({ title, items, onItemClick }: HighlightSectionProps) {
  const getColorClasses = (color: string = 'primary') => {
    switch (color) {
      case 'secondary':
        return 'bg-secondary/10 text-secondary border-secondary/20';
      case 'accent':
        return 'bg-accent/10 text-accent border-accent/20';
      default:
        return 'bg-primary/10 text-primary border-primary/20';
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      
      <div className="grid grid-cols-4 gap-3">
        {items.map((item) => {
          const IconComponent = item.icon;
          
          return (
            <div 
              key={item.id} 
              className="flex flex-col items-center cursor-pointer"
              onClick={() => onItemClick?.(item)}
            >
              <div className="relative mb-2">
                <div className={`w-16 h-16 rounded-full border-2 flex items-center justify-center transition-all duration-200 hover:scale-105 ${getColorClasses(item.color)}`}>
                  <IconComponent className="w-7 h-7" />
                </div>
                
                {item.isNew && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs bg-red-500 text-white hover:bg-red-600">
                    !
                  </Badge>
                )}
              </div>
              
              <span className="text-xs text-center text-muted-foreground font-medium leading-tight">
                {item.title}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}