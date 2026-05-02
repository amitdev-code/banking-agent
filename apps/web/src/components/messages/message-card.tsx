'use client';

import { useState } from 'react';
import { Pencil, Save, X } from 'lucide-react';

import { useMessageEditor } from '@/hooks/use-message-editor';
import { LanguageToggle } from './language-toggle';
import { WhatsAppButton } from './whatsapp-button';

interface MessageCardProps {
  resultId: string;
  phone: string;
  messageEn: string;
  messageHi: string;
  isEdited: boolean;
  editedMessage: string | null;
}

export function MessageCard({
  resultId,
  phone,
  messageEn,
  messageHi,
  isEdited,
  editedMessage,
}: MessageCardProps) {
  const [lang, setLang] = useState<'en' | 'hi'>('en');
  const [editing, setEditing] = useState(false);

  const baseMessage = lang === 'en' ? messageEn : messageHi;
  const displayMessage = isEdited && editedMessage ? editedMessage : baseMessage;

  const { draft, setDraft, save, isSaving } = useMessageEditor(resultId, displayMessage);

  function handleEdit() {
    setDraft(displayMessage);
    setEditing(true);
  }

  async function handleSave() {
    await save();
    setEditing(false);
  }

  return (
    <div className="rounded-md border bg-muted/30 p-3 space-y-2.5 text-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <LanguageToggle language={lang} onChange={setLang} />
          {isEdited && (
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              Edited
            </span>
          )}
        </div>

        {!editing ? (
          <button
            onClick={handleEdit}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Pencil className="h-3 w-3" />
            Edit
          </button>
        ) : (
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
            >
              <Save className="h-3 w-3" />
              {isSaving ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
              Cancel
            </button>
          </div>
        )}
      </div>

      {editing ? (
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={6}
          className="w-full rounded border bg-background px-3 py-2 text-xs font-mono resize-none focus:outline-none focus:ring-1 focus:ring-primary"
        />
      ) : (
        <p className="text-xs whitespace-pre-wrap leading-relaxed">{displayMessage}</p>
      )}

      <WhatsAppButton phone={phone} message={editing ? draft : displayMessage} />
    </div>
  );
}
