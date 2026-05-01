import { readFileSync } from 'fs';
import { join } from 'path';

import type { ProductType } from '@banking-crm/types';

const TEMPLATE_FILES: Record<ProductType, string> = {
  PERSONAL_LOAN: 'personal-loan.md',
  HOME_LOAN: 'home-loan.md',
  CREDIT_CARD: 'credit-card.md',
};

const templateCache = new Map<ProductType, string>();

export function getProductTemplate(product: ProductType): string {
  const cached = templateCache.get(product);
  if (cached) return cached;

  const fileName = TEMPLATE_FILES[product];
  const filePath = join(__dirname, 'templates', fileName);
  const content = readFileSync(filePath, 'utf-8');
  templateCache.set(product, content);
  return content;
}

export function buildRagContext(products: ProductType[]): string {
  const unique = [...new Set(products)];
  return unique
    .map((p) => `## ${p}\n${getProductTemplate(p)}`)
    .join('\n\n---\n\n');
}
