import { useState } from 'react';
import { useKYCStatus } from '@/hooks/useKYCStatus';
import { useAuth } from '@/hooks/useAuth';
import { KYCBlockedMessage } from '@/components/kyc/KYCBlockedMessage';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { AddressAutocomplete } from '@/components/ui/address-autocomplete';
import Map from '@/components/ui/map';
import { useFeeRules } from '@/hooks/useFeeRules';
import { useCategories } from '@/hooks/useCategories';
import { useJobs } from '@/hooks/useJobs';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { 
  Upload,
  X,
  MapPin,
  DollarSign,
  Calendar as CalendarIcon,
  Clock,
  FileImage,
  ArrowLeft,
  Info,
  CreditCard,
  Calculator
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function JobNew() {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const { status: kycStatus, loading: kycLoading } = useKYCStatus();
  const { categories } = useCategories();
  const { createJob } = useJobs();
  const { calculateFees, calculateFeeRange, formatCurrency, getFeeDescription, loading: feeLoading } = useFeeRules();
  
  // All hooks must be called before any early returns
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [coordinates, setCoordinates] = useState<[number, number] | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    categoryId: '',
    budget: '',
    negotiable: false,
    address: '',
    requirements: '',
    urgency: 'normal'
  });

  // Calculate fees when budget changes
  const budgetAmount = parseFloat(formData.budget) || 0;
  const feeCalculation = budgetAmount > 0 ? calculateFees(budgetAmount) : null;

  // Verificar se o usuário pode criar trabalhos - AFTER all hooks
  if (kycLoading) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  // Bloquear se KYC não estiver aprovado - AFTER all hooks
  if (kycStatus && !kycStatus.canUsePlatform) {
    return (
      <AppLayout showKYCBanner={false}>
        <div className="min-h-screen flex items-center justify-center p-4">
          <KYCBlockedMessage />
        </div>
      </AppLayout>
    );
  }

  const handleAddressSelect = (address: string, coords?: [number, number]) => {
    setFormData(prev => ({ ...prev, address }));
    if (coords) {
      setCoordinates(coords);
      setShowMap(true);
    }
  };

  const handleMapLocationSelect = (coords: [number, number], address?: string) => {
    setCoordinates(coords);
    if (address) {
      setFormData(prev => ({ ...prev, address }));
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + selectedImages.length > 5) {
      toast.error('Máximo 5 imagens permitidas');
      return;
    }
    setSelectedImages(prev => [...prev, ...files]);
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate required fields
      if (!formData.title || !formData.description || !formData.categoryId || !formData.budget || !formData.address) {
        toast.error('Preencha todos os campos obrigatórios');
        return;
      }

      if (parseFloat(formData.budget) <= 0) {
        toast.error('O orçamento deve ser maior que zero');
        return;
      }

      const budgetValue = parseFloat(formData.budget);
      const jobData = {
        title: formData.title,
        description: formData.description,
        category_id: formData.categoryId,
        budget_min: budgetValue,
        budget_max: budgetValue,
        requirements: formData.requirements || null,
        deadline_at: selectedDate?.toISOString() || null,
        latitude: coordinates?.[1] || null,
        longitude: coordinates?.[0] || null
      };

      const result = await createJob(jobData);
      
      if (result) {
        toast.success('Trabalho criado com sucesso!', {
          description: 'Seu trabalho foi publicado e prestadores poderão enviar propostas.'
        });
        
        navigate('/jobs');
      } else {
        throw new Error('Falha ao criar trabalho');
      }
    } catch (error) {
      toast.error('Erro ao criar trabalho', {
        description: 'Tente novamente em alguns instantes.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/jobs')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Criar Novo Trabalho</h1>
            <p className="text-muted-foreground">
              Descreva seu trabalho e receba propostas de prestadores qualificados
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Informações Básicas</CardTitle>
                  <CardDescription>
                    Descreva o trabalho que precisa ser realizado
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Título do trabalho *</Label>
                    <Input
                      id="title"
                      placeholder="Ex: Instalação de ar condicionado"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="categoryId">Categoria *</Label>
                      <Select
                        value={formData.categoryId}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, categoryId: value }))}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma categoria" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="urgency">Urgência</Label>
                      <Select
                        value={formData.urgency}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, urgency: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Baixa - até 7 dias</SelectItem>
                          <SelectItem value="normal">Normal - até 3 dias</SelectItem>
                          <SelectItem value="high">Alta - até 1 dia</SelectItem>
                          <SelectItem value="urgent">Urgente - hoje</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição detalhada *</Label>
                    <Textarea
                      id="description"
                      placeholder="Descreva o trabalho com o máximo de detalhes possível..."
                      className="min-h-[120px]"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Seja específico sobre o que precisa ser feito, materiais necessários, etc.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="requirements">Requisitos especiais</Label>
                    <Textarea
                      id="requirements"
                      placeholder="Ex: Experiência comprovada, ferramentas próprias, disponibilidade nos finais de semana..."
                      value={formData.requirements}
                      onChange={(e) => setFormData(prev => ({ ...prev, requirements: e.target.value }))}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Budget and Location */}
              <Card>
                <CardHeader>
                  <CardTitle>Orçamento e Localização</CardTitle>
                  <CardDescription>
                    Defina o valor e onde o serviço será realizado
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="budget">Orçamento (R$) *</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="budget"
                          type="number"
                          placeholder="250"
                          className="pl-10"
                          value={formData.budget}
                          onChange={(e) => setFormData(prev => ({ ...prev, budget: e.target.value }))}
                          required
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Valor que você está disposto a pagar pelo serviço
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="negotiable"
                        checked={formData.negotiable}
                        onChange={(e) => setFormData(prev => ({ ...prev, negotiable: e.target.checked }))}
                        className="rounded border border-input bg-background"
                      />
                      <Label htmlFor="negotiable" className="text-sm font-normal">
                        Aceito negociar o preço com prestadores
                      </Label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Endereço completo *</Label>
                    <AddressAutocomplete
                      value={formData.address}
                      onChange={handleAddressSelect}
                      placeholder="Digite o endereço (ex: Rua das Flores, 123 - Vila Madalena, São Paulo)"
                      className="min-h-[40px]"
                    />
                    <p className="text-xs text-muted-foreground">
                      Digite o endereço e selecione uma das opções para localização precisa
                    </p>
                  </div>

                  {/* Map */}
                  {coordinates && (
                    <div className="space-y-2">
                      <Label>Localização no mapa</Label>
                      <Map
                        center={coordinates}
                        zoom={15}
                        className="h-64"
                        onLocationSelect={handleMapLocationSelect}
                        showMarker={true}
                        interactive={true}
                      />
                      <p className="text-xs text-muted-foreground">
                        Você pode ajustar a localização arrastando o marcador
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Data preferencial (opcional)</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !selectedDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {selectedDate ? format(selectedDate, "PPP", { locale: ptBR }) : "Selecionar data"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={setSelectedDate}
                          initialFocus
                          disabled={(date) => date < new Date()}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </CardContent>
              </Card>

              {/* Images */}
              <Card>
                <CardHeader>
                  <CardTitle>Fotos (opcional)</CardTitle>
                  <CardDescription>
                    Adicione fotos para ajudar os prestadores a entenderem melhor o trabalho
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-3">
                    {selectedImages.map((file, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg border border-border"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeImage(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}

                    {selectedImages.length < 5 && (
                      <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="flex flex-col items-center justify-center">
                          <Upload className="w-5 h-5 text-muted-foreground mb-1" />
                          <p className="text-xs text-muted-foreground">Adicionar foto</p>
                        </div>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          multiple
                          onChange={handleImageUpload}
                        />
                      </label>
                    )}
                  </div>
                  
                  <p className="text-xs text-muted-foreground">
                    Máximo 5 fotos. Formatos aceitos: JPG, PNG, WebP.
                  </p>
                </CardContent>
              </Card>
            </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Fee Calculation */}
                {feeCalculation && !feeLoading && (
                  <Card className="border-primary/20">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Calculator className="h-5 w-5 text-primary" />
                        Resumo Financeiro
                      </CardTitle>
                      <CardDescription>
                        Valores que você irá pagar (totais)
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Valor do trabalho:</span>
                          <span className="font-medium">
                            {formatCurrency(budgetAmount)}
                          </span>
                        </div>
                        
                        <div className="flex justify-between text-sm">
                          <span>Taxa da plataforma ({getFeeDescription()}):</span>
                          <span className="font-medium">
                            {formatCurrency(feeCalculation.platformFee)}
                          </span>
                        </div>
                        
                        <div className="flex justify-between text-sm">
                          <span>Taxa de processamento:</span>
                          <span className="font-medium">
                            {formatCurrency(feeCalculation.processingFee)}
                          </span>
                        </div>
                        
                        <Separator />
                        
                        <div className="flex justify-between font-medium">
                          <span>Total a pagar:</span>
                          <span className="text-primary">
                            {formatCurrency(feeCalculation.total)}
                          </span>
                        </div>

                        {formData.negotiable && (
                          <div className="text-xs text-muted-foreground mt-2 p-2 bg-muted/50 rounded">
                            💡 Prestadores poderão enviar propostas com valores diferentes para negociação
                          </div>
                        )}
                      </div>

                      <div className="p-3 bg-muted rounded-lg">
                        <div className="flex items-start gap-2">
                          <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                          <div className="text-xs space-y-1">
                            <p><strong>Taxa transparente:</strong> {getFeeDescription()}</p>
                            <p>Você só paga quando o trabalho for concluído com sucesso.</p>
                            <p className="text-muted-foreground">Taxa de processamento: 2.9% + R$0,39 (Stripe)</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Preview */}
                <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Pré-visualização</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <h4 className="font-medium">{formData.title || 'Título do trabalho'}</h4>
                    {formData.categoryId && categories.find(c => c.id === formData.categoryId) && (
                      <Badge variant="outline" className="mt-1">
                        {categories.find(c => c.id === formData.categoryId)?.name}
                      </Badge>
                    )}
                  </div>
                  
                  {formData.budget && (
                    <div className="text-lg font-bold text-primary">
                      R$ {formData.budget}
                      {formData.negotiable && <Badge variant="outline" className="ml-2">Negociável</Badge>}
                    </div>
                  )}

                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {formData.description || 'Descrição do trabalho aparecerá aqui...'}
                  </p>

                  {formData.address && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span className="line-clamp-2">{formData.address}</span>
                    </div>
                  )}

                  {selectedDate && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CalendarIcon className="w-4 h-4" />
                      {format(selectedDate, "dd/MM/yyyy", { locale: ptBR })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Tips */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Dicas para um bom trabalho</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                    <p>Seja específico na descrição para receber propostas mais precisas</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                    <p>Adicione fotos para que prestadores entendam melhor o trabalho</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                    <p>Defina um orçamento realista baseado no mercado</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                    <p>Responda rapidamente às propostas para manter o interesse</p>
                  </div>
                </CardContent>
              </Card>

              {/* Submit */}
              <div className="space-y-3">
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading || !formData.title || !formData.categoryId || !formData.budget || !formData.address}
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent animate-spin rounded-full mr-2" />
                      Criando trabalho...
                    </>
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-4 w-4" />
                      Publicar Trabalho
                    </>
                  )}
                </Button>
                
                {feeCalculation && (
                  <p className="text-xs text-center text-muted-foreground">
                    Ao publicar, você concorda em pagar {formatCurrency(feeCalculation.total)} quando o trabalho for concluído
                  </p>
                )}
                
                <Button 
                  type="button"
                  variant="outline" 
                  className="w-full"
                  onClick={() => navigate('/jobs')}
                >
                  Cancelar
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  Ao publicar, você concorda com nossos{' '}
                  <a href="/terms" className="text-primary hover:underline">
                    termos de uso
                  </a>
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}