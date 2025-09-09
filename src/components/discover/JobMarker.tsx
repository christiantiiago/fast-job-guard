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
}

interface JobMarkerProps {
  job: JobWithDistance;
  mapboxgl: any;
  map: any;
  onJobClick: (job: JobWithDistance) => void;
  formatCurrency: (min?: number, max?: number, final?: number) => string;
  formatDistance: (distance: number) => string;
}

export function JobMarker({ job, mapboxgl, map, onJobClick, formatCurrency, formatDistance }: JobMarkerProps) {
  const markerRef = useRef<any>(null);

  useEffect(() => {
    if (!job.latitude || !job.longitude || !mapboxgl || !map) return;

    const markerEl = document.createElement('div');
    const price = formatCurrency(job.budget_min, job.budget_max, job.final_price);
    const distance = job.distance ? formatDistance(job.distance) : '';
    
    // Choose color based on job status
    let borderColor = '#ef4444';
    if (job.status === 'in_progress') borderColor = '#f59e0b';
    else if (job.status === 'completed') borderColor = '#10b981';
    
    markerEl.innerHTML = `
      <div style="
        background: white;
        border-radius: 12px;
        padding: 8px 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        border: 2px solid ${borderColor};
        cursor: pointer;
        min-width: 80px;
        text-align: center;
        position: relative;
        transform: translate(-50%, -100%);
      ">
        <div style="font-size: 12px; font-weight: 600; color: ${borderColor}; margin-bottom: 2px;">
          ${price}
        </div>
        <div style="font-size: 10px; color: #6b7280;">
          ${distance}
        </div>
        ${job.proposal_count && job.proposal_count > 0 ? `
          <div style="
            position: absolute;
            top: -8px;
            right: -8px;
            background: #ef4444;
            color: white;
            border-radius: 50%;
            width: 20px;
            height: 20px;
            font-size: 10px;
            font-weight: bold;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid white;
          ">${job.proposal_count}</div>
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
          border-top: 8px solid ${borderColor};
        "></div>
      </div>
    `;
    
    markerEl.addEventListener('click', (e) => {
      e.stopPropagation();
      onJobClick(job);
    });

    const marker = new mapboxgl.Marker({
      element: markerEl,
      anchor: 'bottom'
    })
      .setLngLat([job.longitude, job.latitude])
      .addTo(map);

    markerRef.current = marker;

    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
      }
    };
  }, [job, mapboxgl, map, onJobClick, formatCurrency, formatDistance]);

  return null;
}