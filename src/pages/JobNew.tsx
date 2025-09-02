import { useState } from 'react';
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
  ArrowLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function JobNew() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    budgetMin: '',
    budgetMax: '',
    address: '',
    requirements: '',
    urgency: 'normal'
  });

  const categories = [
    'Limpeza',
    'Elétrica', 
    'Hidráulica',
    'Pintura',
    'Marcenaria',
    'Jardinagem',
    'Montagem de Móveis',
    'Reforma',
    'Mudança',
    'Outros'
  ];

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
      // Here would be the API call to create the job
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
      
      toast.success('Trabalho criado com sucesso!', {
        description: 'Seu trabalho foi publicado e prestadores poderão enviar propostas.'
      });
      
      navigate('/jobs');
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
                      <Label htmlFor="category">Categoria *</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma categoria" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
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
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="budgetMin">Orçamento mínimo (R$) *</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="budgetMin"
                          type="number"
                          placeholder="150"
                          className="pl-10"
                          value={formData.budgetMin}
                          onChange={(e) => setFormData(prev => ({ ...prev, budgetMin: e.target.value }))}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="budgetMax">Orçamento máximo (R$) *</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="budgetMax"
                          type="number"
                          placeholder="300"
                          className="pl-10"
                          value={formData.budgetMax}
                          onChange={(e) => setFormData(prev => ({ ...prev, budgetMax: e.target.value }))}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Endereço completo *</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Textarea
                        id="address"
                        placeholder="Rua das Flores, 123 - Vila Madalena, São Paulo - SP, 01234-567"
                        className="pl-10 min-h-[80px]"
                        value={formData.address}
                        onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                        required
                      />
                    </div>
                  </div>

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
              {/* Preview */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Pré-visualização</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <h4 className="font-medium">{formData.title || 'Título do trabalho'}</h4>
                    {formData.category && (
                      <Badge variant="outline" className="mt-1">{formData.category}</Badge>
                    )}
                  </div>
                  
                  {(formData.budgetMin || formData.budgetMax) && (
                    <div className="text-lg font-bold text-primary">
                      R$ {formData.budgetMin || '0'} - R$ {formData.budgetMax || '0'}
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
                  disabled={isLoading}
                >
                  {isLoading ? 'Criando trabalho...' : 'Publicar Trabalho'}
                </Button>
                
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