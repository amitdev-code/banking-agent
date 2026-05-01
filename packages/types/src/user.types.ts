export type Role = 'ADMIN' | 'MANAGER' | 'ANALYST';

export interface PiiVisibilityConfig {
  showFullName: boolean;
  showPhone: boolean;
  showEmail: boolean;
  showPan: boolean;
  showAadhaar: boolean;
  showAddress: boolean;
  showDob: boolean;
  showAccountNumber: boolean;
}

export const DEFAULT_PII_VISIBILITY: PiiVisibilityConfig = {
  showFullName: true,
  showPhone: false,
  showEmail: false,
  showPan: false,
  showAadhaar: false,
  showAddress: false,
  showDob: false,
  showAccountNumber: false,
};

export const ADMIN_PII_VISIBILITY: PiiVisibilityConfig = {
  showFullName: true,
  showPhone: true,
  showEmail: true,
  showPan: true,
  showAadhaar: true,
  showAddress: true,
  showDob: true,
  showAccountNumber: true,
};

export interface User {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: Role;
  piiVisibility: PiiVisibilityConfig;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionUser {
  id: string;
  tenantId: string;
  role: Role;
  piiVisibility: PiiVisibilityConfig;
  name: string;
  email: string;
}

export interface UserSummary {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  piiVisibility: PiiVisibilityConfig;
}
