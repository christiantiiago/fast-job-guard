import { useState, useEffect, useRef } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useJobs } from '@/hooks/useJobs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Map, 
  List, 
  Search, 
  Filter, 
  MapPin, 
  Loader2,
  AlertTriangle,
  Eye,
  MessageSquare
} from 'lucide-react';
import { useGeolocation, calculateDistance, formatDistance } from '@/hooks/useGeolocation';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface JobWithDistance {
  id: string;
  title: string;
  description: string;
  latitude?: number;
  longitude?: number;
  budget_min?: number;
  budget_max?: number;
  final_price?: number;
  status: string;
  created_at: string;
  completed_at?: string;
  service_categories?: {
    name: string;
    color?: string;
  };
  addresses?: {
    neighborhood?: string;
    city?: string;
    state?: string;
  };
  distance?: number;
  proposal_count?: number;
}

export default function SimpleMapPage() {
  const { jobs, loading, error, fetchAllPublicJobs } = useJobs();
  const { position, error: geoError, loading: geoLoading } = useGeolocation();
  const navigate = useNavigate();
  
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [jobsWithDistance, setJobsWithDistance] = useState<JobWithDistance[]>([]);
  const [selectedJob, setSelectedJob] = useState<JobWithDistance | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [mapboxError, setMapboxError] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);

  console.log('🔍 SimpleMapPage render - viewMode:', viewMode, 'token:', !!mapboxToken);

  // Get Mapbox token
  useEffect(() => {
    const getToken = async () => {
      console.log('📡 Fetching Mapbox token...');
      try {
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
        
        if (error) {
          console.error('❌ Token error:', error);
          setMapboxError('Erro ao carregar token');
          return;
        }
        
        if (data?.token) {
          console.log('✅ Token received:', data.token.substring(0, 20) + '...');
          setMapboxToken(data.token);
          setMapboxError(null);
        } else {
          console.error('❌ No token in response');
          setMapboxError('Token não encontrado');
        }
      } catch (err) {
        console.error('❌ Token fetch failed:', err);
        setMapboxError('Falha ao carregar token');
      }
    };

    getToken();
  }, []);

  // Fetch and process jobs
  useEffect(() => {
    const loadJobs = async () => {
      console.log('📋 Loading jobs...');
      await fetchAllPublicJobs();
      
      // Get proposal counts
      const { data: proposals } = await supabase
        .from('proposals')
        .select('job_id')
        .eq('status', 'sent');
        
      const proposalCounts = proposals?.reduce((acc, p) => {
        acc[p.job_id] = (acc[p.job_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      console.log('📊 Proposal counts loaded:', Object.keys(proposalCounts).length);
      
      // Filter jobs and add distances
      const now = new Date();
      const validJobs = jobs.filter(job => {
        if (job.status === 'open' || job.status === 'in_progress') return true;
        if (job.status === 'completed') {
          // Show completed jobs for 2 minutes (assuming they just completed)
          return true;
        }
        return false;
      });

      const jobsWithData = validJobs.map(job => ({
        ...job,
        proposal_count: proposalCounts[job.id] || 0,
        distance: position && job.latitude && job.longitude 
          ? calculateDistance(position.latitude, position.longitude, job.latitude, job.longitude)
          : undefined
      })).sort((a, b) => (a.distance || 999) - (b.distance || 999));

      console.log('📍 Jobs with data:', jobsWithData.length);
      setJobsWithDistance(jobsWithData);
    };

    if (jobs.length > 0) {
      loadJobs();
    }
  }, [jobs, position]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken || viewMode !== 'map') {
      console.log('⏭️ Skipping map init:', { container: !!mapContainer.current, token: !!mapboxToken, viewMode });
      return;
    }

    if (map.current) {
      console.log('♻️ Map already exists');
      return;
    }

    try {
      console.log('🗺️ Initializing map...');
      
      // Clear container
      mapContainer.current.innerHTML = '';
      
      // Set token
      mapboxgl.accessToken = mapboxToken;
      
      // Center map
      const center: [number, number] = position 
        ? [position.longitude, position.latitude]
        : [-46.6333, -23.5505];
      
      console.log('📍 Map center:', center);
      
      // Create map
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center,
        zoom: 12,
        antialias: true
      });

      // Add controls
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      // Handle events
      map.current.on('load', () => {
        console.log('✅ Map loaded!');
        setMapLoaded(true);
        setMapboxError(null);
        
        // Resize to ensure proper display
        setTimeout(() => {
          map.current?.resize();
        }, 100);
      });

      map.current.on('error', (e) => {
        console.error('❌ Map error:', e);
        setMapboxError('Erro no mapa: ' + e.error?.message);
      });

      console.log('🎉 Map setup complete');

    } catch (error) {
      console.error('💥 Map initialization failed:', error);
      setMapboxError('Falha ao criar mapa: ' + error.message);
    }

    return () => {
      console.log('🧹 Cleaning up map');
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
      setMapLoaded(false);
    };
  }, [mapboxToken, viewMode, position]);

  // Add job markers
  useEffect(() => {
    if (!map.current || !mapLoaded || viewMode !== 'map') {
      return;
    }

    console.log('📌 Adding', jobsWithDistance.length, 'markers');

    // Clear existing markers
    markers.current.forEach(marker => marker.remove());
    markers.current = [];

    // Add user marker
    if (position) {
      const userEl = document.createElement('div');
      userEl.style.cssText = `
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #3b82f6;
        border: 3px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      `;
      
      const userMarker = new mapboxgl.Marker(userEl)
        .setLngLat([position.longitude, position.latitude])
        .addTo(map.current);
        
      markers.current.push(userMarker);
    }

    // Add job markers
    jobsWithDistance.forEach((job) => {
      if (!job.latitude || job.longitude === null) return;

      const el = document.createElement('div');
      const price = formatCurrency(job.budget_min, job.budget_max, job.final_price);
      
      let color = '#ef4444'; // red for open
      if (job.status === 'in_progress') color = '#f59e0b'; // orange
      if (job.status === 'completed') color = '#10b981'; // green

      el.innerHTML = `
        <div style="
          background: white;
          border: 2px solid ${color};
          border-radius: 8px;
          padding: 6px 8px;
          font-size: 11px;
          font-weight: 600;
          color: ${color};
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          cursor: pointer;
          position: relative;
          text-align: center;
          min-width: 60px;
        ">
          ${price}
          ${job.proposal_count ? `
            <div style="
              position: absolute;
              top: -6px;
              right: -6px;
              background: #ef4444;
              color: white;
              border-radius: 50%;
              width: 16px;
              height: 16px;
              font-size: 9px;
              display: flex;
              align-items: center;
              justify-content: center;
              border: 2px solid white;
            ">${job.proposal_count}</div>
          ` : ''}
        </div>
      `;

      el.addEventListener('click', () => {
        console.log('📍 Job clicked:', job.title);
        setSelectedJob(job);
      });

      const marker = new mapboxgl.Marker(el)
        .setLngLat([job.longitude!, job.latitude])
        .addTo(map.current!);

      markers.current.push(marker);
    });

    console.log('✅ Added', markers.current.length, 'markers');

  }, [mapLoaded, jobsWithDistance, position, viewMode]);

  const formatCurrency = (min?: number, max?: number, final?: number) => {
    const fmt = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    });

    if (final) return fmt.format(final);
    if (min && max) return `${fmt.format(min)}-${fmt.format(max)}`;
    if (min) return `${fmt.format(min)}+`;
    return 'A combinar';
  };

  const getStatusBadge = (status: string) => {
    const configs = {
      'open': { label: 'Aberto', color: 'bg-blue-100 text-blue-800' },
      'in_progress': { label: 'Em andamento', color: 'bg-yellow-100 text-yellow-800' },
      'completed': { label: 'Concluído', color: 'bg-green-100 text-green-800' },
    };
    
    const config = configs[status as keyof typeof configs] || configs.open;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const filteredJobs = jobsWithDistance.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || 
                           job.service_categories?.name === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(jobs.map(job => job.service_categories?.name).filter(Boolean)));

  if (geoLoading || loading) {
    return (
      <AppLayout showKYCBanner={false}>
        <div className="flex items-center justify-center h-96">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground">
              Carregando trabalhos próximos...
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout showKYCBanner={false}>
      <div className="flex flex-col h-full pb-24">
        {/* Header */}
        <div className="bg-background border-b p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">Descobrir Jobs</h1>
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'map' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  console.log('🗺️ Switching to map view');
                  setViewMode('map');
                }}
              >
                <Map className="w-4 h-4 mr-2" />
                Mapa
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  console.log('📋 Switching to list view');
                  setViewMode('list');
                }}
              >
                <List className="w-4 h-4 mr-2" />
                Lista
              </Button>
            </div>
          </div>

          {/* Search and filters */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar trabalhos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-40">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category!}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="text-sm text-muted-foreground flex items-center gap-4">
            <span>{filteredJobs.length} trabalhos encontrados</span>
            {viewMode === 'map' && (
              <span className="text-xs">
                🗺️ Token: {mapboxToken ? '✅' : '❌'} | 
                Carregado: {mapLoaded ? '✅' : '❌'} | 
                Markers: {markers.current.length}
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 relative">
          {viewMode === 'map' ? (
            <div className="h-full relative bg-gray-100">
              {geoError && (
                <div className="absolute top-4 left-4 right-4 bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-destructive z-10">
                  <p className="text-sm font-medium">Erro de localização</p>
                  <p className="text-xs">{geoError}</p>
                </div>
              )}
              
              {mapboxError ? (
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                  <div className="text-center space-y-4 p-6">
                    <AlertTriangle className="w-12 h-12 text-destructive mx-auto" />
                    <div>
                      <p className="text-lg font-medium mb-2">Erro no mapa</p>
                      <p className="text-sm text-muted-foreground mb-4">{mapboxError}</p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setViewMode('list')}
                      >
                        Ver em Lista
                      </Button>
                    </div>
                  </div>
                </div>
              ) : !mapboxToken ? (
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                  <div className="text-center space-y-4">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto" />
                    <p className="text-sm font-medium">Carregando token do mapa...</p>
                  </div>
                </div>
              ) : (
                <>
                  <div 
                    ref={mapContainer} 
                    className="absolute inset-0 w-full h-full"
                    style={{ 
                      minHeight: '400px',
                      backgroundColor: '#e5e7eb' // Gray background while loading
                    }}
                  />
                  
                  {!mapLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/80">
                      <div className="text-center space-y-2">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                        <p className="text-sm text-muted-foreground">Inicializando mapa...</p>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Stats overlay */}
              <div className="absolute top-4 right-4 z-10">
                <Card className="p-3">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4" />
                    <span className="font-medium">{jobsWithDistance.length} trabalhos</span>
                  </div>
                  {position && (
                    <div className="text-xs text-green-600 mt-1 flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      GPS Ativo
                    </div>
                  )}
                </Card>
              </div>

              {/* Selected job details */}
              {selectedJob && (
                <div className="absolute bottom-4 left-4 right-4 z-10 max-w-sm">
                  <Card className="shadow-lg">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg line-clamp-1">{selectedJob.title}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            {getStatusBadge(selectedJob.status)}
                            {selectedJob.proposal_count && selectedJob.proposal_count > 0 && (
                              <Badge className="bg-red-100 text-red-800">
                                <MessageSquare className="w-3 h-3 mr-1" />
                                {selectedJob.proposal_count} proposta{selectedJob.proposal_count > 1 ? 's' : ''}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => setSelectedJob(null)}
                          className="text-muted-foreground hover:text-foreground p-1"
                        >
                          ×
                        </button>
                      </div>
                      
                      <p className="text-sm text-muted-foreground line-clamp-2">{selectedJob.description}</p>
                      
                      <div className="pt-2 border-t">
                        <div className="text-lg font-bold text-primary mb-2">
                          {formatCurrency(selectedJob.budget_min, selectedJob.budget_max, selectedJob.final_price)}
                        </div>
                        
                        <Button 
                          size="sm" 
                          className="w-full"
                          onClick={() => navigate(`/jobs/${selectedJob.id}`)}
                        >
                          Ver Detalhes
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {filteredJobs.map((job) => (
                <Card key={job.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-start gap-2 mb-2">
                          <h3 className="font-semibold text-lg flex-1">{job.title}</h3>
                          {job.proposal_count && job.proposal_count > 0 && (
                            <Badge className="bg-red-100 text-red-800">
                              <MessageSquare className="w-3 h-3 mr-1" />
                              {job.proposal_count}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {job.description}
                        </p>
                        <div className="flex items-center gap-2 mb-2">
                          {getStatusBadge(job.status)}
                          <Badge variant="outline" className="text-xs">
                            {job.service_categories?.name}
                          </Badge>
                          {job.distance && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="w-3 h-3" />
                              {formatDistance(job.distance)}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-primary">
                          {formatCurrency(job.budget_min, job.budget_max, job.final_price)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(job.created_at).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {job.addresses ? 
                            `${job.addresses.neighborhood}, ${job.addresses.city}` : 
                            'Localização não informada'
                          }
                        </div>
                      </div>
                      
                      <Button 
                        size="sm"
                        onClick={() => navigate(`/jobs/${job.id}`)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Ver Detalhes
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}