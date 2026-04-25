'use client';

import { useEffect } from 'react';

function getRejectionName(reason: unknown): string {
  if (reason instanceof Error) return reason.name.toLowerCase();
  if (
    typeof reason === 'object' &&
    reason !== null &&
    'name' in reason &&
    typeof reason.name === 'string'
  ) {
    return reason.name.toLowerCase();
  }
  return '';
}

function getRejectionMessage(reason: unknown): string {
  if (reason instanceof Error) return reason.message.toLowerCase();
  if (
    typeof reason === 'object' &&
    reason !== null &&
    'message' in reason &&
    typeof reason.message === 'string'
  ) {
    return reason.message.toLowerCase();
  }
  if (typeof reason === 'string') return reason.toLowerCase();
  return '';
}

function isIgnorableMediaAbort(reason: unknown): boolean {
  const name = getRejectionName(reason);
  const message = getRejectionMessage(reason);
  const isAbort = name === 'aborterror' || message.includes('aborterror');
  const isPlayInterruption =
    message.includes('play() request was interrupted') ||
    message.includes('media was removed from the document');
  return isPlayInterruption || (isAbort && message.includes('media'));
}

export function BrowserRejectionGuard() {
  useEffect(() => {
    function handleUnhandledRejection(event: PromiseRejectionEvent) {
      if (!isIgnorableMediaAbort(event.reason)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    }

    window.addEventListener('unhandledrejection', handleUnhandledRejection, {
      capture: true,
    });
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection, {
        capture: true,
      });
    };
  }, []);

  return null;
}
