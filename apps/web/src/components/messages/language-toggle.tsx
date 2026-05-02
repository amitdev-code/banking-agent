'use client';

interface LanguageToggleProps {
  language: 'en' | 'hi';
  onChange: (lang: 'en' | 'hi') => void;
}

export function LanguageToggle({ language, onChange }: LanguageToggleProps) {
  return (
    <div className="flex rounded-md border overflow-hidden text-xs">
      <button
        onClick={() => onChange('en')}
        className={`px-2.5 py-1 font-medium transition-colors ${
          language === 'en' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
        }`}
      >
        EN
      </button>
      <button
        onClick={() => onChange('hi')}
        className={`px-2.5 py-1 font-medium transition-colors ${
          language === 'hi' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
        }`}
      >
        हि
      </button>
    </div>
  );
}
