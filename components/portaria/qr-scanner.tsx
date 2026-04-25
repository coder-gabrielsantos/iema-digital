'use client';

import { useEffect, useRef, useState } from 'react';
import { CameraOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QrScannerProps {
  onScan: (data: string) => void;
  active: boolean;
}

export function QrScanner({ onScan, active }: QrScannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<unknown>(null);
  const observerRef = useRef<MutationObserver | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [error, setError] = useState('');
  const [started, setStarted] = useState(false);

  const localizeScannerUi = () => {
    const root = document.getElementById('qr-reader');
    if (!root) return;

    const normalize = (text: string) => text.trim().toLowerCase().replace(/\s+/g, ' ');
    const translations: Record<string, string> = {
      'request camera permissions': 'Permitir acesso à câmera',
      'camera scanning not supported': 'Leitura por câmera não suportada',
      'select camera': 'Selecionar câmera',
      'start scanning': 'Iniciar leitura',
      'stop scanning': 'Parar leitura',
    };

    const scanImageLabels = new Set([
      'scan an image file',
      'escanear arquivo de imagem',
    ]);

    root.querySelectorAll<HTMLElement>('a, button').forEach((el) => {
      const text = el.textContent?.trim();
      if (!text) return;
      if (scanImageLabels.has(normalize(text))) {
        el.remove();
      }
    });

    root.querySelectorAll<HTMLElement>('button, a, span, label, option, p').forEach((el) => {
      const currentText = el.textContent?.trim();
      if (!currentText) return;
      const translated = translations[normalize(currentText)];
      if (translated) {
        if (el.children.length === 0) {
          el.textContent = translated;
        }
      }
    });
  };

  const stopScanner = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    if (scannerRef.current) {
      const s = scannerRef.current as { clear: () => Promise<void> };
      s.clear().catch(() => {});
      scannerRef.current = null;
      setStarted(false);
    }
  };

  useEffect(() => {
    if (!active) {
      stopScanner();
      return;
    }

    let scanner: { render: (onSuccess: (r: string) => void, onError: (e: unknown) => void) => Promise<void>; clear: () => Promise<void> } | null = null;

    async function startScanner() {
      try {
        const { Html5QrcodeScanner, Html5QrcodeScanType } = await import('html5-qrcode');
        scanner = new Html5QrcodeScanner(
          'qr-reader',
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            rememberLastUsedCamera: true,
            showTorchButtonIfSupported: true,
            supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
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

        localizeScannerUi();
        const root = document.getElementById('qr-reader');
        if (root) {
          observerRef.current = new MutationObserver(() => {
            localizeScannerUi();
          });
          observerRef.current.observe(root, {
            childList: true,
            subtree: true,
            characterData: true,
          });
        }
        intervalRef.current = setInterval(localizeScannerUi, 400);

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

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl bg-red-50 px-6 py-8 text-center">
        <CameraOff className="h-9 w-9 text-red-400" />
        <p className="text-sm text-red-600">{error}</p>
        <Button variant="outline" size="sm" onClick={() => setError('')}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div id="qr-reader" ref={containerRef} className="w-full" />
      {!started && active && (
        <div className="flex h-48 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-100 border-t-indigo-600" />
        </div>
      )}
    </div>
  );
}
