'use client';

import { useEffect, useRef, useState } from 'react';
import { CameraOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QrScannerProps {
  onScan: (data: string) => void;
  active: boolean;
}

export function QrScanner({ onScan, active }: QrScannerProps) {
  const scannerRef = useRef<{
    stop: () => Promise<void>;
    clear: () => Promise<void>;
    isScanning?: boolean;
  } | null>(null);
  const [error, setError] = useState('');
  const [started, setStarted] = useState(false);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    setError('');

    if (!active) {
      const currentScanner = scannerRef.current;
      if (currentScanner) {
        if (currentScanner.isScanning) {
          currentScanner.stop().catch(() => {});
        }
        currentScanner.clear().catch(() => {});
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
          await html5QrCode.stop().catch(() => {});
          await html5QrCode.clear().catch(() => {});
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
          currentScanner.stop().catch(() => {});
        }
        currentScanner.clear().catch(() => {});
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
    <div className="w-full">
      <div id="qr-reader" className="w-full" />
      {!started && active && (
        <div className="flex h-48 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-100 border-t-indigo-600" />
        </div>
      )}
    </div>
  );
}
