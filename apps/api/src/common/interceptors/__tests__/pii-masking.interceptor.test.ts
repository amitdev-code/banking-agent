import { PiiMaskingInterceptor } from '../pii-masking.interceptor';
import type { PiiVisibilityConfig, SessionUser } from '@banking-crm/types';

function makeUser(overrides: Partial<PiiVisibilityConfig> = {}): SessionUser {
  return {
    id: 'user-1',
    tenantId: 'tenant-1',
    tenantName: 'Test Bank',
    tenantSlug: 'test-bank',
    role: 'ANALYST',
    name: 'Test User',
    email: 'test@test.com',
    piiVisibility: {
      showFullName: true,
      showPhone: false,
      showEmail: false,
      showPan: false,
      showAadhaar: false,
      showAddress: false,
      showDob: false,
      showAccountNumber: false,
      ...overrides,
    },
  };
}

// Access private maskData via type cast for unit testing
function maskData(interceptor: PiiMaskingInterceptor, data: unknown, user: SessionUser): unknown {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (interceptor as any).maskData(data, user.piiVisibility);
}

describe('PiiMaskingInterceptor', () => {
  let interceptor: PiiMaskingInterceptor;

  beforeEach(() => {
    interceptor = new PiiMaskingInterceptor();
  });

  it('masks phone when showPhone=false', () => {
    const user = makeUser({ showPhone: false });
    const result = maskData(interceptor, { phone: '9876543210' }, user) as Record<string, string>;
    expect(result['phone']).toBe('XXXXXX3210');
  });

  it('shows phone when showPhone=true', () => {
    const user = makeUser({ showPhone: true });
    const result = maskData(interceptor, { phone: '9876543210' }, user) as Record<string, string>;
    expect(result['phone']).toBe('9876543210');
  });

  it('masks email when showEmail=false', () => {
    const user = makeUser({ showEmail: false });
    const result = maskData(interceptor, { email: 'john@example.com' }, user) as Record<string, string>;
    expect(result['email']).toMatch(/^j\*\*\*@/);
  });

  it('masks pan when showPan=false', () => {
    const user = makeUser({ showPan: false });
    const result = maskData(interceptor, { pan: 'ABCDE1234F' }, user) as Record<string, string>;
    expect(result['pan']).not.toBe('ABCDE1234F');
  });

  it('shows fullName when showFullName=true', () => {
    const user = makeUser({ showFullName: true });
    const result = maskData(interceptor, { fullName: 'John Doe' }, user) as Record<string, string>;
    expect(result['fullName']).toBe('John Doe');
  });

  it('masks nested objects recursively', () => {
    const user = makeUser({ showPhone: false });
    const result = maskData(
      interceptor,
      { customer: { phone: '9876543210', name: 'John' } },
      user
    ) as { customer: Record<string, string> };
    expect(result.customer['phone']).toBe('XXXXXX3210');
    expect(result.customer['name']).toBe('John');
  });

  it('masks PII fields in arrays', () => {
    const user = makeUser({ showPhone: false });
    const result = maskData(
      interceptor,
      [{ phone: '9876543210' }, { phone: '1234567890' }],
      user
    ) as Array<Record<string, string>>;
    expect(result[0]!['phone']).toBe('XXXXXX3210');
    expect(result[1]!['phone']).toBe('XXXX7890');
  });

  it('passes through non-PII fields unchanged', () => {
    const user = makeUser();
    const result = maskData(interceptor, { city: 'Mumbai', age: 35 }, user) as Record<string, unknown>;
    expect(result['city']).toBe('Mumbai');
    expect(result['age']).toBe(35);
  });
});
