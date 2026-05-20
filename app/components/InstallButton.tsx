'use client';

import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): void;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallButton() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!prompt) return null;

  async function handleInstall() {
    const p = prompt!;
    p.prompt();
    const { outcome } = await p.userChoice;
    if (outcome === 'accepted') setPrompt(null);
  }

  return (
    <button
      onClick={handleInstall}
      style={{
        display: 'flex', alignItems: 'center', gap: 4,
        fontSize: 13, color: '#4b5563', background: 'none',
        border: 'none', cursor: 'pointer', fontWeight: 600,
        padding: '6px 9px', borderRadius: 8,
      }}
    >
      <Download size={13} strokeWidth={2.2} />
      앱설치
    </button>
  );
}
