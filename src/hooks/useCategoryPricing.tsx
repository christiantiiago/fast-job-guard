import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CategoryPricing {
  categoryId: string;
  categoryName: string;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  totalJobs: number;
}

export const useCategoryPricing = () => {
  const [pricingData, setPricingData] = useState<CategoryPricing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPricingData();
  }, []);

  const fetchPricingData = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          budget_min,
          budget_max,
          service_categories!fk_jobs_category (
            id,
            name
          )
        `)
        .not('status', 'eq', 'cancelled')
        .gt('budget_min', 0)
        .gt('budget_max', 0);
      
      if (error) {
        console.error('Error fetching category pricing:', error);
        return;
      }

      if (data) {
        // Process data to calculate averages by category
        const categoryMap = new Map<string, {
          categoryId: string;
          categoryName: string;
          prices: number[];
          minPrice: number;
          maxPrice: number;
        }>();

        data.forEach((job: any) => {
          if (job.service_categories) {
            const categoryId = job.service_categories.id;
            const categoryName = job.service_categories.name;
            const avgJobPrice = (job.budget_min + job.budget_max) / 2;

            if (!categoryMap.has(categoryId)) {
              categoryMap.set(categoryId, {
                categoryId,
                categoryName,
                prices: [],
                minPrice: job.budget_min,
                maxPrice: job.budget_max
              });
            }

            const category = categoryMap.get(categoryId)!;
            category.prices.push(avgJobPrice);
            category.minPrice = Math.min(category.minPrice, job.budget_min);
            category.maxPrice = Math.max(category.maxPrice, job.budget_max);
          }
        });

        // Calculate averages and convert to final format
        const pricing: CategoryPricing[] = Array.from(categoryMap.values()).map(category => ({
          categoryId: category.categoryId,
          categoryName: category.categoryName,
          avgPrice: category.prices.reduce((sum, price) => sum + price, 0) / category.prices.length,
          minPrice: category.minPrice,
          maxPrice: category.maxPrice,
          totalJobs: category.prices.length
        }));

        setPricingData(pricing);
      }
    } catch (error) {
      console.error('Error in fetchPricingData:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryPricing = (categoryId: string): CategoryPricing | null => {
    return pricingData.find(item => item.categoryId === categoryId) || null;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return {
    pricingData,
    loading,
    getCategoryPricing,
    formatCurrency,
    refetch: fetchPricingData
  };
};