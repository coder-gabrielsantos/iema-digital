'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QrScannerProps {
  onScan: (data: string) => void;
  active: boolean;
}

export function QrScanner({ onScan, active }: QrScannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<unknown>(null);
  const [error, setError] = useState('');
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!active) {
      stopScanner();
      return;
    }

    let scanner: { render: (onSuccess: (r: string) => void, onError: (e: unknown) => void) => Promise<void>; clear: () => Promise<void> } | null = null;

    async function startScanner() {
      try {
        const { Html5QrcodeScanner } = await import('html5-qrcode');
        scanner = new Html5QrcodeScanner(
          'qr-reader',
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            rememberLastUsedCamera: true,
            showTorchButtonIfSupported: true,
          },
          false
        ) as unknown as typeof scanner;

        scannerRef.current = scanner;

        (scanner as unknown as { render: (s: (r: string) => void, e: () => void) => void }).render(
          (result: string) => {
            onScan(result);
          },
          () => {}
        );

        setStarted(true);
        setError('');
      } catch (e) {
        console.error(e);
        setError('Não foi possível iniciar a câmera. Verifique as permissões.');
      }
    }

    startScanner();

    return () => {
      stopScanner();
    };
  }, [active, onScan]);

  function stopScanner() {
    if (scannerRef.current) {
      const s = scannerRef.current as { clear: () => Promise<void> };
      s.clear().catch(() => {});
      scannerRef.current = null;
      setStarted(false);
    }
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-red-200 bg-red-50 p-8 text-center">
        <CameraOff className="h-12 w-12 text-red-400" />
        <p className="text-sm text-red-600">{error}</p>
        <Button variant="outline" size="sm" onClick={() => setError('')}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white">
      <div id="qr-reader" ref={containerRef} className="w-full" />
      {!started && active && (
        <div className="flex items-center justify-center h-48">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      )}
    </div>
  );
}
