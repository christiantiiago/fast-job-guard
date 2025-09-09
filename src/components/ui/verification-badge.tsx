import { CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface VerificationBadgeProps {
  isVerified: boolean;
  verifiedAt?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export const VerificationBadge = ({ 
  isVerified, 
  verifiedAt, 
  size = 'md', 
  showText = false 
}: VerificationBadgeProps) => {
  if (!isVerified) return null;

  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const tooltipText = verifiedAt 
    ? `Verificado em ${new Date(verifiedAt).toLocaleDateString('pt-BR')}`
    : 'Perfil verificado';

  const badgeContent = (
    <Badge 
      variant="secondary" 
      className="bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 gap-1 px-2 py-1"
    >
      <CheckCircle className={`${sizeClasses[size]} text-blue-600`} />
      {showText && <span className="text-xs font-medium">Verificado</span>}
    </Badge>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badgeContent}
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};