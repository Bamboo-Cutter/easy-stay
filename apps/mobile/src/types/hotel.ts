export type HotelListQuery = {
  city?: string;
  keyword?: string;
  check_in?: string;
  check_out?: string;
  rooms_count?: number;
  page?: number;
  limit?: number;
  sort?: 'recommended' | 'price_asc' | 'price_desc' | 'rating_desc' | 'star_desc' | 'newest';
  min_price?: number;
  max_price?: number;
  min_star?: number;
  min_rating?: number;
  breakfast?: boolean;
  refundable?: boolean;
};

export type HotelItem = {
  id: string;
  name_cn: string;
  name_en?: string;
  city: string;
  address: string;
  star: number;
  hotel_images?: Array<{ url: string; sort: number }>;
  hotel_tags?: Array<{ tag: string }>;
  review_summary?: { rating: number; review_count: number };
  min_nightly_price?: number;
  rooms?: Array<{ base_price: number }>;
};

export type HotelListResponse = {
  items: HotelItem[];
  total: number;
  page: number;
  limit: number;
};

export type ReviewSummary = {
  hotel_id: string;
  rating: number;
  review_count: number;
  grade: string;
  dimensions: {
    cleanliness: number;
    service: number;
    facilities: number;
    location: number;
  };
  ai_summary: string;
};

export type HotelOffer = {
  room_id: string;
  room_name: string;
  base_price: number;
  refundable: boolean;
  breakfast: boolean;
  max_occupancy: number;
  nightly_price: number;
  total_price: number;
  nights: number;
  available_rooms: number;
  is_available: boolean;
};

export type HotelOffersResponse = {
  hotel_id: string;
  check_in: string;
  check_out: string;
  rooms_count: number;
  items: HotelOffer[];
};

export type HomeBanner = {
  id: string;
  title: string;
  subtitle: string;
  image: string | null;
  cta: string;
  min_price: number | null;
};

export type FilterMetadata = {
  city: string | null;
  price_range: { min: number; max: number };
  star_counts: Array<{ star: number; count: number }>;
  room_feature_counts: { breakfast: number; refundable: number };
  rating_bands: { '6_plus': number; '7_plus': number; '8_plus': number; '9_plus': number };
  popular_tags: Array<{ tag: string; count: number }>;
};

export type HotelCalendarResponse = {
  hotel_id: string;
  month: string;
  days: Array<{
    date: string;
    min_price: number | null;
    is_available: boolean;
  }>;
};
