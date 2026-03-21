'use client';

import { useEffect, useState } from 'react';

export default function InstallButton() {
  const [prompt, setPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!prompt) return null;

  async function handleInstall() {
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') setPrompt(null);
  }

  return (
    <button
      onClick={handleInstall}
      style={{ fontSize: 13, color: '#374151', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0 }}
    >
      📲 앱설치
    </button>
  );
}
