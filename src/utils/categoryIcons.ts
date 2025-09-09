import { 
  Zap, 
  Droplets, 
  Brush, 
  Leaf, 
  Sparkles, 
  Wrench, 
  Car, 
  Home, 
  Camera, 
  Monitor,
  LucideIcon 
} from 'lucide-react';

// Mapeamento dos icon_name do banco para ícones Lucide
export const categoryIconMap: Record<string, LucideIcon> = {
  'zap': Zap,
  'droplets': Droplets,
  'brush': Brush,
  'leaf': Leaf,
  'sparkles': Sparkles,
  'wrench': Wrench,
  'car': Car,
  'home': Home,
  'camera': Camera,
  'monitor': Monitor,
};

export const getCategoryIcon = (iconName?: string | null): LucideIcon => {
  if (!iconName) return Wrench; // ícone padrão
  return categoryIconMap[iconName] || Wrench;
};