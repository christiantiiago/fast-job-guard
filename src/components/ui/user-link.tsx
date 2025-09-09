import { Link } from 'react-router-dom';

interface UserLinkProps {
  userId: string;
  name: string;
  className?: string;
}

export function UserLink({ userId, name, className = "" }: UserLinkProps) {
  return (
    <Link 
      to={`/profile/${userId}`}
      className={`font-medium text-primary hover:text-primary/80 hover:underline transition-colors ${className}`}
    >
      {name}
    </Link>
  );
}