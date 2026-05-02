export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatScore(score: number): string {
  return `${Math.round(score)}/100`;
}

export function formatProbability(prob: number): string {
  return `${Math.round(prob * 100)}%`;
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
}

export function formatRelativeTime(date: string | Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function buildWhatsAppLink(phone: string, message: string): string {
  const normalized = phone.startsWith('+') ? phone : `+91${phone}`;
  return `https://wa.me/${normalized.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
}
