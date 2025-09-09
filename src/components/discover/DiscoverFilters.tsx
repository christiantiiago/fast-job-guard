import { Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface DiscoverFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  categories: string[];
  resultCount: number;
  jobsWithLocation: number;
  jobsWithoutLocation: number;
  closestJob: any;
  formatDistance: (distance: number) => string;
  formatCurrency: (min?: number, max?: number, final?: number) => string;
}

export function DiscoverFilters({
  searchTerm,
  setSearchTerm,
  selectedCategory,
  setSelectedCategory,
  categories,
  resultCount,
  jobsWithLocation,
  jobsWithoutLocation,
  closestJob,
  formatDistance,
  formatCurrency
}: DiscoverFiltersProps) {
  return (
    <div className="bg-background border-b p-4 space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Buscar por título ou descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {categories.map(category => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2 text-sm text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>{resultCount} trabalho(s) encontrado(s)</span>
          <div className="flex gap-4 text-xs">
            <span className="flex items-center">
              📍 {jobsWithLocation} no mapa
            </span>
            <span className="flex items-center">
              📋 {jobsWithoutLocation} sem localização
            </span>
          </div>
        </div>
        
        {closestJob && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-blue-800 text-sm">Trabalho mais próximo:</p>
                <p className="text-blue-700 font-semibold line-clamp-1">{closestJob.title}</p>
              </div>
              <div className="text-right">
                <p className="text-blue-800 font-bold">
                  {formatCurrency(closestJob.budget_min, closestJob.budget_max, closestJob.final_price)}
                </p>
                <p className="text-blue-600 text-sm">
                  📍 {formatDistance(closestJob.routeDistance || closestJob.distance || 0)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}