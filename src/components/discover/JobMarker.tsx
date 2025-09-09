import { useEffect, useRef } from 'react';
import { getCategoryIcon } from '@/utils/categoryIcons';

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
    icon_name?: string;
  };
  addresses?: {
    neighborhood?: string;
    city?: string;
    state?: string;
  };
  distance?: number;
  proposal_count?: number;
  routeDistance?: number;
  routeDuration?: number;
}

interface JobMarkerProps {
  job: JobWithDistance;
  mapboxgl: any;
  map: any;
  onJobClick: (job: JobWithDistance) => void;
  formatCurrency: (min?: number, max?: number, final?: number) => string;
  formatDistance: (distance: number) => string;
  formatDuration: (duration: number) => string;
}

export function JobMarker({ job, mapboxgl, map, onJobClick, formatCurrency, formatDistance, formatDuration }: JobMarkerProps) {
  const markerRef = useRef<any>(null);

  useEffect(() => {
    if (!job.latitude || !job.longitude || !mapboxgl || !map) return;

    const markerEl = document.createElement('div');
    const price = formatCurrency(job.budget_min, job.budget_max, job.final_price);
    const distance = job.routeDistance ? formatDistance(job.routeDistance) : '';
    const duration = job.routeDuration ? formatDuration(job.routeDuration) : '';
    
    // Get category icon
    const CategoryIcon = getCategoryIcon(job.service_categories?.icon_name);
    
    // Choose colors based on job status
    let bgGradient, avatarBg, shadowColor;
    
    if (job.status === 'in_progress') {
      bgGradient = 'linear-gradient(135deg, #f59e0b, #d97706)';
      avatarBg = '#f59e0b';
      shadowColor = 'rgba(245, 158, 11, 0.4)';
    } else if (job.status === 'completed') {
      bgGradient = 'linear-gradient(135deg, #10b981, #059669)';
      avatarBg = '#10b981';
      shadowColor = 'rgba(16, 185, 129, 0.4)';
    } else {
      bgGradient = 'linear-gradient(135deg, #3b82f6, #2563eb)';
      avatarBg = '#3b82f6';
      shadowColor = 'rgba(59, 130, 246, 0.4)';
    }
    
    // Create category icon SVG
    const createIconSVG = (iconName: string) => {
      const iconMap: Record<string, string> = {
        'zap': '<path d="m9.69 7.17 2.74-2.74.01-.01 2.74-2.74h-3.06v-1.44L16.26 4l-1.44 1.44v1.44h-3.06L14.5 9.62l-1.44 1.44H9v-3.89Z"/>',
        'droplets': '<path d="M7 16.5C7 20.09 9.91 23 13.5 23s6.5-2.91 6.5-6.5c0-2.1-1.31-4.35-2.95-6.53C16.5 8.9 15.5 7.7 14.5 6.5c-.86-1.03-1.5-1.75-1.5-2.5C13 2.91 12.09 2 11 2S9 2.91 9 4c0 .75-.64 1.47-1.5 2.5-1 1.2-2 2.4-2.55 3.47C3.31 12.15 2 14.4 2 16.5 2 20.09 4.91 23 8.5 23s6.5-2.91 6.5-6.5"/>',
        'brush': '<path d="m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08"/>',
        'leaf': '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/>',
        'sparkles': '<path d="M9 3l1 4 4 1-4 1-1 4-1-4-4-1 4-1 1-4Z"/>',
        'wrench': '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
        'car': '<path d="M8 6v6h8V6"/><path d="M4 6h16l-2 12H6L4 6Z"/>',
        'home': '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
        'camera': '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>',
        'monitor': '<rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/>'
      };
      
      const iconPath = iconMap[iconName] || iconMap['wrench'];
      return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconPath}</svg>`;
    };

    markerEl.innerHTML = `
      <div class="worker-marker" style="
        position: relative;
        cursor: pointer;
        transition: transform 0.2s ease;
        transform-origin: center bottom;
      ">
        <!-- Worker Avatar -->
        <div style="
          width: 48px;
          height: 48px;
          background: ${avatarBg};
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px ${shadowColor}, 0 2px 6px rgba(0,0,0,0.1);
          border: 3px solid white;
          margin: 0 auto 8px auto;
          position: relative;
          z-index: 2;
        ">
          ${createIconSVG(job.service_categories?.icon_name || 'wrench')}
        </div>
        
        <!-- Info Card -->
        <div style="
          background: white;
          border-radius: 12px;
          padding: 8px 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          border: 1px solid rgba(0,0,0,0.1);
          min-width: 120px;
          text-align: center;
          position: relative;
          z-index: 1;
        ">
          <div style="
            font-size: 13px; 
            font-weight: 700; 
            color: #1f2937;
            margin-bottom: 2px;
          ">
            ${price}
          </div>
          <div style="
            font-size: 10px; 
            color: #6b7280;
            line-height: 1.2;
          ">
            ${distance}${duration ? ` • ${duration}` : ''}
          </div>
          
          <!-- Arrow pointing to avatar -->
          <div style="
            position: absolute;
            top: -6px;
            left: 50%;
            transform: translateX(-50%);
            width: 0;
            height: 0;
            border-left: 6px solid transparent;
            border-right: 6px solid transparent;
            border-bottom: 6px solid white;
          "></div>
        </div>

        <!-- Proposal count badge -->
        ${job.proposal_count && job.proposal_count > 0 ? `
          <div style="
            position: absolute;
            top: -4px;
            right: -4px;
            background: linear-gradient(135deg, #ef4444, #dc2626);
            color: white;
            border-radius: 50%;
            width: 20px;
            height: 20px;
            font-size: 10px;
            font-weight: 700;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 8px rgba(239, 68, 68, 0.4);
            border: 2px solid white;
            z-index: 3;
          ">
            ${job.proposal_count}
          </div>
        ` : ''}
      </div>
    `;

    // Add smooth hover effects (sem mudança de posição)
    const workerMarker = markerEl.querySelector('.worker-marker') as HTMLElement;
    
    markerEl.addEventListener('mouseenter', () => {
      if (workerMarker) {
        workerMarker.style.transform = 'scale(1.1)';
        workerMarker.style.zIndex = '1000';
      }
    });
    
    markerEl.addEventListener('mouseleave', () => {
      if (workerMarker) {
        workerMarker.style.transform = 'scale(1)';
        workerMarker.style.zIndex = '999';
      }
    });

    // Add click handler with smooth zoom functionality
    markerEl.addEventListener('click', (e) => {
      e.stopPropagation();
      
      // Smooth zoom to job location
      if (map && job.latitude && job.longitude) {
        map.easeTo({
          center: [job.longitude, job.latitude],
          zoom: 16,
          duration: 1000,
          easing: (t) => t * (2 - t) // easeOutQuad
        });
      }
      
      // Add click animation (sem alterar posição do marker)
      if (workerMarker) {
        workerMarker.style.transform = 'scale(0.95)';
        setTimeout(() => {
          workerMarker.style.transform = 'scale(1)';
        }, 150);
      }
      
      // Call the job click handler after zoom starts
      setTimeout(() => {
        onJobClick(job);
      }, 400);
    });

    // Create marker and add to map (posição fixa e precisa)
    markerRef.current = new mapboxgl.Marker(markerEl, { 
      anchor: 'bottom',
      offset: [0, 0]
    })
      .setLngLat([job.longitude, job.latitude])
      .addTo(map);

    // Cleanup function
    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
    };
  }, [job, mapboxgl, map, onJobClick, formatCurrency, formatDistance, formatDuration]);

  return null;
}