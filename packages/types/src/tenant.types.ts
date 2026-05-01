export interface Tenant {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantSummary {
  id: string;
  name: string;
  slug: string;
}
