import { useEffect, useRef } from 'react';

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
    
    // Choose gradient colors based on job status
    let bgGradient = 'linear-gradient(135deg, #ef4444, #dc2626)'; // red gradient for open
    let textColor = '#ffffff';
    let shadowColor = 'rgba(239, 68, 68, 0.3)';
    
    if (job.status === 'in_progress') {
      bgGradient = 'linear-gradient(135deg, #f59e0b, #d97706)'; // amber gradient for in progress
      textColor = '#ffffff';
      shadowColor = 'rgba(245, 158, 11, 0.3)';
    } else if (job.status === 'completed') {
      bgGradient = 'linear-gradient(135deg, #10b981, #059669)'; // emerald gradient for completed
      textColor = '#ffffff';
      shadowColor = 'rgba(16, 185, 129, 0.3)';
    }
    
    markerEl.innerHTML = `
      <div style="
        background: ${bgGradient};
        color: ${textColor};
        padding: 10px 14px;
        border-radius: 16px;
        font-size: 12px;
        font-weight: 600;
        line-height: 1.3;
        text-align: center;
        cursor: pointer;
        box-shadow: 0 6px 20px ${shadowColor}, 0 2px 8px rgba(0,0,0,0.1);
        border: 2px solid rgba(255,255,255,0.2);
        backdrop-filter: blur(10px);
        min-width: 90px;
        transform: translateX(-50%) translateY(-100%);
        position: relative;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      ">
        <div style="font-size: 13px; font-weight: 700; margin-bottom: 4px; text-shadow: 0 1px 2px rgba(0,0,0,0.1);">
          ${price}
        </div>
        <div style="font-size: 10px; opacity: 0.95; line-height: 1.2; text-shadow: 0 1px 2px rgba(0,0,0,0.1);">
          ${distance}${duration ? `<br/>${duration}` : ''}
        </div>
        ${job.proposal_count && job.proposal_count > 0 ? `
          <div style="
            position: absolute;
            top: -6px;
            right: -6px;
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
          ">
            ${job.proposal_count}
          </div>
        ` : ''}
        <div style="
          position: absolute;
          bottom: -8px;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 8px solid transparent;
          border-right: 8px solid transparent;
          border-top: 8px solid;
          border-top-color: ${job.status === 'in_progress' ? '#d97706' : job.status === 'completed' ? '#059669' : '#dc2626'};
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
        "></div>
      </div>
    `;

    // Add hover effects
    markerEl.addEventListener('mouseenter', () => {
      markerEl.style.transform = 'translateX(-50%) translateY(-100%) scale(1.08)';
      markerEl.style.zIndex = '1000';
      markerEl.querySelector('div').style.boxShadow = `0 8px 30px ${shadowColor}, 0 4px 12px rgba(0,0,0,0.15)`;
    });
    
    markerEl.addEventListener('mouseleave', () => {
      markerEl.style.transform = 'translateX(-50%) translateY(-100%) scale(1)';
      markerEl.style.zIndex = '999';
      markerEl.querySelector('div').style.boxShadow = `0 6px 20px ${shadowColor}, 0 2px 8px rgba(0,0,0,0.1)`;
    });

    // Add click handler with smooth zoom functionality
    markerEl.addEventListener('click', (e) => {
      e.stopPropagation();
      
      // Smooth zoom to job location
      if (map && job.latitude && job.longitude) {
        map.easeTo({
          center: [job.longitude, job.latitude],
          zoom: 16,
          duration: 1200,
          easing: (t) => t * (2 - t) // easeOutQuad
        });
      }
      
      // Add click animation
      markerEl.style.transform = 'translateX(-50%) translateY(-100%) scale(0.95)';
      setTimeout(() => {
        markerEl.style.transform = 'translateX(-50%) translateY(-100%) scale(1)';
      }, 150);
      
      // Call the job click handler after zoom starts
      setTimeout(() => {
        onJobClick(job);
      }, 600);
    });

    // Create marker and add to map
    markerRef.current = new mapboxgl.Marker(markerEl, { 
      anchor: 'bottom',
      offset: [0, 8]
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