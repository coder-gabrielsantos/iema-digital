'use client';

import { useEffect, useRef, useState } from 'react';
import { CameraOff, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QrScannerProps {
  onScan: (data: string) => void;
  active: boolean;
  feedbackToken?: number;
  onRequestStart?: () => void;
}

export function QrScanner({ onScan, active, feedbackToken = 0, onRequestStart }: QrScannerProps) {
  const scannerRef = useRef<{
    stop: () => void | Promise<void>;
    clear: () => void | Promise<void>;
    isScanning?: boolean;
  } | null>(null);
  const [error, setError] = useState('');
  const [retryToken, setRetryToken] = useState(0);
  const onScanRef = useRef(onScan);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  function isIgnorableStartError(error: unknown): boolean {
    const message = getErrorMessage(error);
    return (
      message.includes('play() request was interrupted') ||
      message.includes('media was removed from the document')
    );
  }

  function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message.toLowerCase();
    if (typeof error === 'string') return error.toLowerCase();
    return '';
  }

  async function cleanupScanner(
    scanner: { stop: () => void | Promise<void>; clear: () => void | Promise<void> } | null
  ) {
    if (!scanner) return;

    // html5-qrcode requires stopping before clearing the instance.
    try {
      await Promise.resolve(scanner.stop());
    } catch {
      // Ignore: stop can fail when scanner never fully started.
    }

    try {
      await Promise.resolve(scanner.clear());
    } catch {
      // Ignore: clear can fail when the DOM node was already disposed.
    }
  }

  useEffect(() => {
    setError('');

    if (!active) {
      const currentScanner = scannerRef.current;
      if (currentScanner) {
        void cleanupScanner(currentScanner);
        scannerRef.current = null;
      }
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
          (result: string) => onScanRef.current(result),
          () => {}
        );

        if (!mounted) {
          await cleanupScanner(html5QrCode);
          return;
        }

        setError('');
      } catch (e) {
        if (isIgnorableStartError(e)) return;
        // Keeps scanner failures silent in UI logs during camera re-init races.
        setError('Não foi possível iniciar a câmera. Verifique as permissões.');
      }
    }

    startScanner();

    return () => {
      mounted = false;
      const currentScanner = scannerRef.current;
      if (currentScanner) {
        void cleanupScanner(currentScanner);
        scannerRef.current = null;
      }
    };
  }, [active, retryToken]);

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

  if (!active) {
    return (
      <div className="flex min-h-[360px] items-center justify-center bg-slate-50">
        <Button
          type="button"
          onClick={onRequestStart}
          className="h-10 rounded-full bg-indigo-500 px-5 text-white hover:bg-indigo-600"
        >
          <Play className="mr-2 h-4 w-4" />
          Abrir câmera
        </Button>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <div
        id="qr-reader"
        className="w-full min-h-[360px] [&>div]:!border-0 [&_video]:!h-[360px] [&_video]:!w-full [&_video]:object-cover"
      />
    </div>
  );
}
