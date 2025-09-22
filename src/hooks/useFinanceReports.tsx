import { useAuth } from './useAuth';
import { useFinanceData } from './useFinanceData';
import { useFeeRules } from './useFeeRules';
import { supabase } from '@/integrations/supabase/client';
import jsPDF from 'jspdf';

interface ReportData {
  period: string;
  totalEarnings: number;
  totalFees: number;
  netEarnings: number;
  jobsCompleted: number;
  avgJobValue: number;
  topCategories: Array<{ category: string; earnings: number; jobs: number }>;
  monthlyBreakdown: Array<{ month: string; earnings: number; jobs: number }>;
}

export const useFinanceReports = () => {
  const { user } = useAuth();
  const { payments, stats } = useFinanceData();
  const { feeRules, isPremiumUser, formatCurrency } = useFeeRules();

  const generateReportData = async (
    type: 'monthly' | 'annual' | 'tax',
    period: string
  ): Promise<ReportData> => {
    // Filtrar pagamentos baseado no período
    const filteredPayments = payments.filter(payment => {
      const paymentDate = new Date(payment.created_at);
      const now = new Date();
      
      switch (period) {
        case 'month':
          return paymentDate.getMonth() === now.getMonth() && 
                 paymentDate.getFullYear() === now.getFullYear();
        case 'last-month':
          const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          return paymentDate.getMonth() === lastMonth.getMonth() && 
                 paymentDate.getFullYear() === lastMonth.getFullYear();
        case 'year':
          return paymentDate.getFullYear() === now.getFullYear();
        default:
          return true;
      }
    });

    const escrowPayments = filteredPayments.filter(p => 
      p.type === 'escrow' && (p.status === 'completed' || p.status === 'released')
    );

    const totalEarnings = escrowPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalFees = escrowPayments.reduce((sum, p) => 
      sum + (p.amount - (p.net_amount || p.amount)), 0
    );
    const netEarnings = totalEarnings - totalFees;

    // Buscar dados de categorias dos jobs
    const jobIds = escrowPayments.map(p => p.external_id).filter(Boolean);
    let categoryData: Array<{ category: string; earnings: number; jobs: number }> = [];

    if (jobIds.length > 0) {
      const { data: jobsData } = await supabase
        .from('jobs')
        .select(`
          id,
          category_id,
          service_categories(name)
        `)
        .in('id', jobIds);

      if (jobsData) {
        const categoryMap = new Map<string, { earnings: number; jobs: number }>();
        
        jobsData.forEach(job => {
          const payment = escrowPayments.find(p => p.external_id === job.id);
          if (payment) {
            const categoryName = (job.service_categories as any)?.name || 'Outros';
            const current = categoryMap.get(categoryName) || { earnings: 0, jobs: 0 };
            categoryMap.set(categoryName, {
              earnings: current.earnings + (payment.net_amount || payment.amount),
              jobs: current.jobs + 1
            });
          }
        });

        categoryData = Array.from(categoryMap.entries()).map(([category, data]) => ({
          category,
          ...data
        }));
      }
    }

    // Criar breakdown mensal
    const monthlyMap = new Map<string, { earnings: number; jobs: number }>();
    escrowPayments.forEach(payment => {
      const date = new Date(payment.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const current = monthlyMap.get(monthKey) || { earnings: 0, jobs: 0 };
      monthlyMap.set(monthKey, {
        earnings: current.earnings + (payment.net_amount || payment.amount),
        jobs: current.jobs + 1
      });
    });

    const monthlyBreakdown = Array.from(monthlyMap.entries()).map(([month, data]) => ({
      month: new Date(month + '-01').toLocaleDateString('pt-BR', { 
        month: 'long', 
        year: 'numeric' 
      }),
      ...data
    }));

    return {
      period: getPeriodLabel(period),
      totalEarnings,
      totalFees,
      netEarnings,
      jobsCompleted: escrowPayments.length,
      avgJobValue: escrowPayments.length > 0 ? totalEarnings / escrowPayments.length : 0,
      topCategories: categoryData.sort((a, b) => b.earnings - a.earnings).slice(0, 5),
      monthlyBreakdown
    };
  };

  const generatePDF = (reportData: ReportData, type: 'monthly' | 'annual' | 'tax') => {
    const doc = new jsPDF();
    const margin = 20;
    let yPos = margin;

    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Job Fast - Relatório Financeiro', margin, yPos);
    yPos += 15;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text(`Período: ${reportData.period}`, margin, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, margin, yPos);
    yPos += 20;

    // Resumo Financeiro
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumo Financeiro', margin, yPos);
    yPos += 15;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');

    const summaryData = [
      ['Receita Bruta:', formatCurrency(reportData.totalEarnings)],
      ['Taxas Cobradas:', formatCurrency(reportData.totalFees)],
      ['Receita Líquida:', formatCurrency(reportData.netEarnings)],
      ['Trabalhos Concluídos:', reportData.jobsCompleted.toString()],
      ['Ticket Médio:', formatCurrency(reportData.avgJobValue)]
    ];

    summaryData.forEach(([label, value]) => {
      doc.text(label, margin, yPos);
      doc.text(value, margin + 80, yPos);
      yPos += 8;
    });

    yPos += 15;

    // Performance por Categoria
    if (reportData.topCategories.length > 0) {
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Performance por Categoria', margin, yPos);
      yPos += 15;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');

      reportData.topCategories.forEach((category, index) => {
        doc.text(`${index + 1}. ${category.category}`, margin, yPos);
        doc.text(`${formatCurrency(category.earnings)} (${category.jobs} jobs)`, margin + 80, yPos);
        yPos += 8;
      });

      yPos += 15;
    }

    // Breakdown Mensal
    if (reportData.monthlyBreakdown.length > 0) {
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Evolução Mensal', margin, yPos);
      yPos += 15;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');

      reportData.monthlyBreakdown.forEach(month => {
        doc.text(month.month, margin, yPos);
        doc.text(`${formatCurrency(month.earnings)} (${month.jobs} jobs)`, margin + 80, yPos);
        yPos += 8;

        // Nova página se necessário
        if (yPos > 250) {
          doc.addPage();
          yPos = margin;
        }
      });
    }

    // Footer com informações da plataforma
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Job Fast - Plataforma de Serviços | Página ${i} de ${pageCount}`, 
        margin, doc.internal.pageSize.height - 10);
    }

    // Download do arquivo
    const fileName = `jobfast-relatorio-${type}-${new Date().getTime()}.pdf`;
    doc.save(fileName);
  };

  const generateReport = async (type: 'monthly' | 'annual' | 'tax', period: string = 'month') => {
    if (!user) throw new Error('User not authenticated');

    try {
      const reportData = await generateReportData(type, period);
      generatePDF(reportData, type);
      return true;
    } catch (error) {
      console.error('Error generating report:', error);
      throw error;
    }
  };

  const getPeriodLabel = (period: string): string => {
    const now = new Date();
    
    switch (period) {
      case 'month':
        return now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      case 'last-month':
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return lastMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      case 'year':
        return now.getFullYear().toString();
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3) + 1;
        return `${quarter}º Trimestre de ${now.getFullYear()}`;
      default:
        return period;
    }
  };

  return {
    generateReport,
    generateReportData
  };
};