'use client';

import { useEffect, useRef, useState } from 'react';
import { CameraOff, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QrScannerProps {
  onScan: (data: string) => void;
  active: boolean;
  feedbackToken?: number;
}

export function QrScanner({ onScan, active, feedbackToken = 0 }: QrScannerProps) {
  const scannerRef = useRef<{
    stop: () => void | Promise<void>;
    clear: () => void | Promise<void>;
    isScanning?: boolean;
  } | null>(null);
  const [error, setError] = useState('');
  const [started, setStarted] = useState(false);
  const [retryToken, setRetryToken] = useState(0);
  const [showScanFeedback, setShowScanFeedback] = useState(false);

  useEffect(() => {
    if (!active || feedbackToken === 0) return;
    setShowScanFeedback(true);
    const timeout = setTimeout(() => setShowScanFeedback(false), 350);
    return () => clearTimeout(timeout);
  }, [active, feedbackToken]);

  useEffect(() => {
    setError('');

    if (!active) {
      const currentScanner = scannerRef.current;
      if (currentScanner) {
        if (currentScanner.isScanning) {
          void Promise.resolve(currentScanner.stop()).catch(() => {});
        }
        void Promise.resolve(currentScanner.clear()).catch(() => {});
        scannerRef.current = null;
      }
      setStarted(false);
      return;
    }

    let mounted = true;

    async function startScanner() {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');

        const cameras = await Html5Qrcode.getCameras();
        if (!cameras.length) {
          throw new Error('Nenhuma câmera encontrada no dispositivo.');
        }

        const html5QrCode = new Html5Qrcode('qr-reader');
        scannerRef.current = html5QrCode as unknown as typeof scannerRef.current;

        const preferredCamera = cameras.find((camera) =>
          /back|rear|traseira|environment/i.test(camera.label)
        );
        const cameraId = preferredCamera?.id ?? cameras[0].id;

        await html5QrCode.start(
          cameraId,
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (result: string) => onScan(result),
          () => {}
        );

        if (!mounted) {
          await Promise.resolve(html5QrCode.stop()).catch(() => {});
          await Promise.resolve(html5QrCode.clear()).catch(() => {});
          return;
        }

        setStarted(true);
        setError('');
      } catch (e) {
        console.error(e);
        setError('Não foi possível iniciar a câmera. Verifique as permissões.');
        setStarted(false);
      }
    }

    startScanner();

    return () => {
      mounted = false;
      const currentScanner = scannerRef.current;
      if (currentScanner) {
        if (currentScanner.isScanning) {
          void Promise.resolve(currentScanner.stop()).catch(() => {});
        }
        void Promise.resolve(currentScanner.clear()).catch(() => {});
        scannerRef.current = null;
      }
      setStarted(false);
    };
  }, [active, onScan, retryToken]);

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl bg-red-50 px-6 py-8 text-center">
        <CameraOff className="h-9 w-9 text-red-400" />
        <p className="text-sm text-red-600">{error}</p>
        <Button variant="outline" size="sm" onClick={() => setRetryToken((prev) => prev + 1)}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <div id="qr-reader" className="w-full" />
      {showScanFeedback && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <div className="rounded-full border border-emerald-200 bg-white/95 p-3 shadow-lg">
            <Check className="h-8 w-8 text-emerald-500" strokeWidth={2.5} />
          </div>
        </div>
      )}
      {!started && active && (
        <div className="flex h-48 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-100 border-t-indigo-600" />
        </div>
      )}
    </div>
  );
}
