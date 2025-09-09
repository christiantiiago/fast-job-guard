import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowRight, Gift } from 'lucide-react';

interface PromoBannerProps {
  title: string;
  subtitle: string;
  description: string;
  buttonText: string;
  isNew?: boolean;
  onAction?: () => void;
}

export function PromoBanner({ 
  title, 
  subtitle, 
  description, 
  buttonText, 
  isNew = false,
  onAction 
}: PromoBannerProps) {
  return (
    <Card className="relative overflow-hidden border-0 p-0">
      <div className="primary-gradient p-6 text-white relative">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute right-0 top-0 w-32 h-32 bg-white/20 rounded-full -translate-y-16 translate-x-16" />
          <div className="absolute right-16 bottom-0 w-24 h-24 bg-white/10 rounded-full translate-y-8" />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Gift className="w-6 h-6 text-white" />
              </div>
            </div>
            
            <div className="flex-1">
              {isNew && (
                <Badge className="mb-2 bg-white/20 text-white hover:bg-white/25 border-0">
                  Nova parceria
                </Badge>
              )}
              
              <h2 className="text-xl font-bold mb-1">{title}</h2>
              <h3 className="text-lg font-semibold mb-2">{subtitle}</h3>
              <p className="text-white/90 text-sm mb-4 leading-relaxed">
                {description}
              </p>
              
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={onAction}
                className="bg-white/20 text-white hover:bg-white/30 border-0"
              >
                {buttonText}
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}