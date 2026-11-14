/** Catalog shapes as the server sends them (docnowtesting/server/src/routes/catalog.ts). */

export type ProductType = 'TEST' | 'PACKAGE' | 'PROFILE' | 'PARAMETER';

export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
}

/** Built by the server from its cached Healthians details, so cards need no extra call. */
export interface DetailsSummary {
  testCount: number | null;
  constituentsPreview: string[];
  remainingConstituents: number;
  fastingLabel: string | null;
  idealFor: string | null;
  reportingTime: string | null;
}

export interface CatalogProduct {
  id: string;
  partnerCode: string;
  name: string;
  type: ProductType;
  /** Rupees, already discounted by the server. Never recomputed here. */
  price: number;
  /** Rupees, only present when it is above `price`. */
  mrp?: number | null;
  description?: string | null;
  purpose?: string | null;
  parameters?: string | null;
  sampleType?: string | null;
  reportTime?: string | null;
  categories?: ProductCategory[];
  detailsSummary?: DetailsSummary | null;
}

export interface Constituent {
  id: string;
  name: string;
}

/** The server's cached copy of the partner's rich details, stored on the catalog row. */
export interface CachedDetails {
  fasting?: string | null;
  fastingTime?: string | null;
  reportingTime?: string | null;
  gender?: string[];
  ageGroup?: string[];
  description?: string | null;
  constituents?: Constituent[];
}

export interface ProductDetail extends CatalogProduct {
  detailsData?: CachedDetails | null;
}

export interface ProductPage {
  products: CatalogProduct[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** What the detail screen shows, after cached and live partner details are merged. */
export interface ProductFacts {
  sampleType: string | null;
  fasting: string | null;
  reportTime: string | null;
  idealFor: string | null;
  description: string | null;
  constituents: Constituent[];
  /** Parameters the partner did not name, so the count can still be honest. */
  unnamedConstituents: number;
}
