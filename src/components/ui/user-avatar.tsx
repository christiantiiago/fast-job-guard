import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface UserAvatarProps {
  src?: string | null;
  name?: string | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  sm: 'h-6 w-6 text-xs',
  md: 'h-8 w-8 text-sm',
  lg: 'h-10 w-10 text-base',
  xl: 'h-12 w-12 text-lg'
};

export function UserAvatar({ 
  src, 
  name, 
  className,
  size = 'lg'
}: UserAvatarProps) {
  const getInitials = (fullName?: string | null) => {
    if (!fullName) return 'U';
    return fullName
      .split(' ')
      .map(n => n.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      <AvatarImage 
        src={src || undefined} 
        alt={name || 'User avatar'}
      />
      <AvatarFallback className="bg-primary/10 text-primary font-medium">
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}