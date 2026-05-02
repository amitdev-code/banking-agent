'use client';

import { useState } from 'react';
import { Check, Copy, MessageCircle } from 'lucide-react';
import { buildWhatsAppLink } from '@/lib/formatters';

interface WhatsAppButtonProps {
  phone: string;
  message: string;
}

export function WhatsAppButton({ phone, message }: WhatsAppButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleOpen() {
    window.open(buildWhatsAppLink(phone, message), '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={handleCopy}
        className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? 'Copied!' : 'Copy'}
      </button>
      <button
        onClick={handleOpen}
        className="flex items-center gap-1.5 rounded-md bg-[#25D366] text-white px-3 py-1.5 text-xs font-medium hover:bg-[#20bd5a] transition-colors"
      >
        <MessageCircle className="h-3.5 w-3.5" />
        Send via WhatsApp
      </button>
    </div>
  );
}
