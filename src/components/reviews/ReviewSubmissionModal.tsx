import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Star, Clock, Shield } from "lucide-react";
import { useReviews, JobToReview } from "@/hooks/useReviews";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface ReviewSubmissionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReviewSubmitted?: () => void;
}

export const ReviewSubmissionModal: React.FC<ReviewSubmissionModalProps> = ({
  open,
  onOpenChange,
  onReviewSubmitted
}) => {
  const { user } = useAuth();
  const { fetchJobsToReview, submitReview } = useReviews();
  const [jobsToReview, setJobsToReview] = useState<JobToReview[]>([]);
  const [selectedJob, setSelectedJob] = useState<JobToReview | null>(null);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);

  // Carregar jobs disponíveis para avaliação
  useEffect(() => {
    if (open && user) {
      loadJobsToReview();
    }
  }, [open, user]);

  const loadJobsToReview = async () => {
    setLoading(true);
    try {
      const jobs = await fetchJobsToReview();
      setJobsToReview(jobs);
    } catch (error) {
      console.error('Error loading jobs to review:', error);
      toast.error('Erro ao carregar trabalhos para avaliação');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedJob || rating === 0) {
      toast.error('Por favor, selecione um trabalho e uma avaliação');
      return;
    }

    setSubmitting(true);
    try {
      const targetUserId = user?.id === selectedJob.client_id 
        ? selectedJob.provider_id 
        : selectedJob.client_id;

      await submitReview(
        selectedJob.id,
        targetUserId,
        rating,
        comment,
        isAnonymous
      );

      toast.success('Avaliação enviada! Será publicada em 7 dias.');
      
      // Reset form
      setSelectedJob(null);
      setRating(0);
      setComment('');
      setIsAnonymous(false);
      
      // Reload jobs
      await loadJobsToReview();
      
      onReviewSubmitted?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error('Erro ao enviar avaliação');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (currentRating: number, onStarClick?: (star: number) => void, onStarHover?: (star: number) => void) => {
    return (
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-8 h-8 cursor-pointer transition-colors ${
              star <= (hoveredRating || currentRating)
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300 hover:text-yellow-400'
            }`}
            onClick={() => onStarClick?.(star)}
            onMouseEnter={() => onStarHover?.(star)}
            onMouseLeave={() => onStarHover?.(0)}
          />
        ))}
      </div>
    );
  };

  const getTargetUserName = (job: JobToReview) => {
    if (user?.id === job.client_id) {
      return job.provider_name || 'Prestador';
    }
    return job.client_name || 'Cliente';
  };

  const getUserRole = (job: JobToReview) => {
    return user?.id === job.client_id ? 'cliente' : 'prestador';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            Avaliar Trabalho Concluído
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informação sobre o sistema */}
          <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <Clock className="w-5 h-5 flex-shrink-0" />
                <Shield className="w-5 h-5 flex-shrink-0" />
              </div>
              <div className="text-sm">
                <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                  Sistema de Avaliação com Delay de Segurança
                </p>
                <p className="text-blue-700 dark:text-blue-300">
                  Sua avaliação será publicada em <strong>7 dias</strong> para evitar conflitos imediatos. 
                  Você pode escolher avaliar de forma anônima e o usuário só verá a avaliação após o período de segurança.
                </p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : jobsToReview.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Star className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Não há trabalhos concluídos para avaliar no momento.</p>
            </div>
          ) : (
            <>
              {/* Seleção do trabalho */}
              <div className="space-y-3">
                <label className="text-sm font-medium">Selecione o trabalho para avaliar:</label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {jobsToReview.map((job) => (
                    <div
                      key={job.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedJob?.id === job.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => setSelectedJob(job)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{job.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            Avaliar como {getUserRole(job)}: <strong>{getTargetUserName(job)}</strong>
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedJob && (
                <>
                  {/* Avaliação por estrelas */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium">Sua avaliação:</label>
                    <div className="flex items-center gap-4">
                      {renderStars(
                        rating,
                        setRating,
                        setHoveredRating
                      )}
                      <span className="text-sm text-muted-foreground">
                        {rating > 0 && (
                          <>
                            {rating} de 5 estrelas
                            {rating === 5 && ' - Excelente!'}
                            {rating === 4 && ' - Muito bom!'}
                            {rating === 3 && ' - Bom'}
                            {rating === 2 && ' - Regular'}
                            {rating === 1 && ' - Precisa melhorar'}
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Comentário */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium">Comentário (opcional):</label>
                    <Textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Descreva sua experiência com o trabalho realizado..."
                      className="min-h-[100px]"
                      maxLength={500}
                    />
                    <p className="text-xs text-muted-foreground">
                      {comment.length}/500 caracteres
                    </p>
                  </div>

                  {/* Opção anônima */}
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="anonymous"
                      checked={isAnonymous}
                      onCheckedChange={(checked) => setIsAnonymous(checked as boolean)}
                    />
                    <label htmlFor="anonymous" className="text-sm">
                      Avaliar anonimamente (seu nome não será exibido)
                    </label>
                  </div>

                  {/* Botões */}
                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => onOpenChange(false)}
                      disabled={submitting}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={rating === 0 || submitting}
                    >
                      {submitting ? 'Enviando...' : 'Enviar Avaliação'}
                    </Button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};