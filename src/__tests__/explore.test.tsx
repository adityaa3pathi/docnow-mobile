import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { consult } from '@/lib/consult/api';
import type { DoctorSummary, Specialty } from '@/lib/consult/types';
import { catalogApi } from '@/lib/tests/api';
import type { CatalogItem } from '@/lib/tests/types';
import { cleanup, flush, render } from '@/test-utils/render';
import ExploreTestsScreen from '@/app/tests/explore';

vi.mock('expo-router', () => ({ router: { push: vi.fn(), back: vi.fn() }, useLocalSearchParams: () => ({}) }));
vi.mock('expo-image', () => ({ Image: () => null }));
const addToCart = vi.hoisted(() => vi.fn(async () => true));
vi.mock('@/lib/tests/cart-context', () => ({ useCart: () => ({ cartCount: 0, addToCart, getItemCount: () => 0 }) }));

const specialty = (name: string): Specialty => ({ id: `s-${name}`, name, slug: name.toLowerCase().replace(/\s+/g, '-'), isActive: true });
const GP = specialty('General Physician');
const DERMA = specialty('Dermatology');

const doctor = (id: string, displayName: string, s: Specialty): DoctorSummary => ({
  id,
  displayName,
  photoUrl: null,
  qualification: 'MBBS',
  experienceYears: 10,
  languages: ['English', 'Hindi'],
  bio: null,
  consultationFee: 499,
  slotMinutes: 15,
  specialty: { id: s.id, name: s.name, slug: s.slug },
});
const DOCTORS = [doctor('d-1', 'Dr. Anjali Mehta', GP), doctor('d-2', 'Dr. Rohan Kapoor', DERMA)];

const product = (code: string, name: string): CatalogItem => ({
  id: `p-${code}`,
  partnerCode: code,
  name,
  searchName: name.toLowerCase(),
  type: 'TEST',
  partnerPrice: 200,
  displayPrice: 600,
  discountedPrice: 399,
  description: null,
  parameters: '24 Parameters',
  sampleType: 'Blood',
  reportTime: '24 hrs',
  isEnabled: true,
  isFeatured: false,
  featuredOrder: null,
});

/** Lets the 250 ms search debounce and the mocked API calls finish. */
async function settle() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(300);
  });
  await flush();
}

async function type(text: string) {
  const el = document.querySelector<HTMLInputElement>('[data-testid="search-input"]')!;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  await act(async () => {
    setter.call(el, text);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await settle();
}

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return render(
    <Wrapper>
      <ExploreTestsScreen />
    </Wrapper>,
  );
}

describe('unified search: doctors + lab tests', () => {
  let products: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    vi.spyOn(consult, 'doctors').mockResolvedValue(DOCTORS);
    vi.spyOn(consult, 'specialties').mockResolvedValue([GP, DERMA]);
    vi.spyOn(catalogApi, 'categories').mockResolvedValue([]);
    products = vi.spyOn(catalogApi, 'products').mockImplementation(async ({ search } = {}) => ({
      products: search === 'kapoor' ? [] : [product('CBC', 'Complete Blood Count')],
      totalCount: 1,
      page: 1,
      limit: 30,
      totalPages: 1,
    }));
  });
  afterEach(async () => {
    await cleanup();
    vi.useRealTimers();
  });

  it('shows matching doctors and lab tests together under All', async () => {
    const ui = await mount();
    await settle();
    await type('fever');

    expect(ui.getByTestId('segment-all').getAttribute('aria-selected')).toBe('true');
    expect(ui.getByTestId('section-doctors').textContent).toBe('Doctors (1)');
    expect(ui.queryByTestId('search-doctor-d-1')?.textContent).toContain('Dr. Anjali Mehta');
    expect(ui.queryByTestId('search-doctor-d-2')).toBeNull();
    expect(ui.getByTestId('section-tests').textContent).toBe('Lab Tests & Packages (1)');
    expect(ui.queryByTestId('product-CBC')?.textContent).toContain('24 Parameters');
    // "All" searches the whole catalog, without the Lab Tests segment's type filter.
    expect(products).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'fever', type: undefined, category: undefined }));
  });

  it('finds a doctor by name and adds a test to the cart from the same results', async () => {
    const ui = await mount();
    await settle();
    await type('kapoor');
    expect(ui.getByTestId('section-doctors').textContent).toBe('Doctors (1)');
    expect(ui.queryByTestId('search-doctor-d-2')).not.toBeNull();
    expect(ui.queryByTestId('section-tests')).toBeNull();

    await type('');
    await ui.press('product-add-CBC');
    expect(addToCart).toHaveBeenCalledWith('CBC');
  });

  it('switches between All, Doctors and Lab Tests', async () => {
    const ui = await mount();
    await settle();

    await ui.press('segment-doctors');
    await settle();
    expect(ui.getByTestId('segment-doctors').getAttribute('aria-selected')).toBe('true');
    expect(ui.getByTestId('section-doctors').textContent).toBe('Doctors (2)');
    expect(ui.queryAllByTestIdPrefix('search-doctor-')).toHaveLength(2);
    expect(ui.queryByTestId('product-CBC')).toBeNull();
    expect(ui.container.textContent).toContain('Dermatology');

    // The specialty tiles narrow the doctor list.
    const derma = ui.container.querySelector<HTMLElement>('[aria-label="Filter by Dermatology"]')!;
    await act(async () => derma.click());
    expect(ui.queryAllByTestIdPrefix('search-doctor-').map((el) => el.dataset.testid)).toEqual(['search-doctor-d-2']);

    await ui.press('segment-tests');
    await settle();
    expect(ui.queryAllByTestIdPrefix('search-doctor-')).toHaveLength(0);
    expect(ui.queryByTestId('product-CBC')).not.toBeNull();
    expect(ui.container.textContent).toContain('Single Tests');

    await ui.press('segment-all');
    await settle();
    expect(ui.getByTestId('section-doctors').textContent).toBe('Doctors (2)');
    expect(ui.queryByTestId('product-CBC')).not.toBeNull();
  });
});
