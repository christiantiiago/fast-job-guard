import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Pen, Trash2, Check, Smartphone, Monitor } from 'lucide-react';

interface DigitalSignatureProps {
  isOpen: boolean;
  onClose: () => void;
  onSignature: (signatureData: string) => void;
  title?: string;
  description?: string;
  signerName: string;
  signerRole: string;
}

export function DigitalSignature({
  isOpen,
  onClose,
  onSignature,
  title = "Assinatura Digital",
  description = "Desenhe sua assinatura na área abaixo",
  signerName,
  signerRole
}: DigitalSignatureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth <= 768);
    
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setupCanvas();
    }
  }, [isOpen]);

  const setupCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = isMobile ? 300 : 400;
    canvas.height = isMobile ? 150 : 200;

    // Set canvas style
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = isMobile ? 3 : 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Add background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add signature line
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(20, canvas.height - 30);
    ctx.lineTo(canvas.width - 20, canvas.height - 30);
    ctx.stroke();
    
    // Reset drawing style
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = isMobile ? 3 : 2;
  };

  const getEventPos = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if (e.touches) {
      // Touch event
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY
      };
    } else {
      // Mouse event
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      };
    }
  };

  const startDrawing = (e: any) => {
    e.preventDefault();
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const pos = getEventPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setHasSignature(true);
  };

  const draw = (e: any) => {
    e.preventDefault();
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const pos = getEventPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDrawing = (e: any) => {
    e.preventDefault();
    setIsDrawing(false);
  };

  const clearSignature = () => {
    setupCanvas();
    setHasSignature(false);
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) return;

    const signatureData = canvas.toDataURL('image/png');
    onSignature(signatureData);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pen className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Signer Info */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{signerName}</p>
                  <p className="text-sm text-muted-foreground">{signerRole}</p>
                </div>
                <Badge variant="outline" className="flex items-center gap-1">
                  {isMobile ? <Smartphone className="h-3 w-3" /> : <Monitor className="h-3 w-3" />}
                  {isMobile ? 'Mobile' : 'Desktop'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Signature Canvas */}
          <div className="space-y-2">
            <div className="border-2 border-dashed border-muted rounded-lg p-4 bg-background">
              <canvas
                ref={canvasRef}
                className="border border-border rounded cursor-crosshair mx-auto block touch-none"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              {isMobile ? 'Use o dedo para desenhar sua assinatura' : 'Use o mouse para desenhar sua assinatura'}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={clearSignature}
              className="flex-1"
              disabled={!hasSignature}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Limpar
            </Button>
            <Button
              onClick={saveSignature}
              className="flex-1"
              disabled={!hasSignature}
            >
              <Check className="h-4 w-4 mr-2" />
              Assinar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}