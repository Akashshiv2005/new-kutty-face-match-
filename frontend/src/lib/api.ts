const rawBackendOrigin = (import.meta.env.VITE_BACKEND_ORIGIN || "").trim().replace(/^=+/, "").replace(/\/+$/, "");
const rawApiUrl = (import.meta.env.VITE_API_URL || "/api/v1").trim();
const normalizedApiPath = rawApiUrl.startsWith("/") ? rawApiUrl : `/${rawApiUrl}`;

export const BACKEND_ORIGIN = rawBackendOrigin;
export const API_URL = rawApiUrl;
export const API_BASE = rawBackendOrigin ? `${rawBackendOrigin}${normalizedApiPath}` : normalizedApiPath;

/**
 * Resolves a backend URL or relative asset path with the configured VITE_BACKEND_ORIGIN.
 * If the path starts with http://, https://, blob:, or data:, it returns as is.
 * Otherwise, it prepends BACKEND_ORIGIN if available.
 */
export function resolveBackendUrl(path?: string | null): string {
  if (!path) return "";
  if (
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("blob:") ||
    path.startsWith("data:")
  ) {
    return path;
  }
  if (BACKEND_ORIGIN) {
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return `${BACKEND_ORIGIN}${cleanPath}`;
  }
  return path;
}

export interface StoryPage {
  id: string;
  story_id: string;
  page_index: number;
  page_number: number;
  page_type: string;
  story_text: string;
  extracted_text: string;
  scene_description: string;
  character_guidance: string;
  prompt_template: string;
  personalization_required: boolean;
  allow_illustration_generation: boolean;
  original_image_path: string;
  original_image_url: string;
  face_outline_points?: string;
  text_x?: number;
  text_y?: number;
  font_size?: number;
  font_family?: string;
  font_color?: string;
  letter_spacing?: number;
  stroke_color?: string;
  stroke_width?: number;
  has_shadow?: boolean;
  soft_line_break?: boolean;
  has_background_box?: boolean;
  box_bg_color?: string;
  box_border_color?: string;
  box_border_width?: number;
  box_bg_opacity?: number;
  text_align?: string;
  box_layout?: string;
  box_border_radius?: number;
  warp_style?: string;
  gender_variant?: string;
  translations?: string;
}

export interface StoryTemplate {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  age_range: string;
  language: string;
  price_digital: number;
  price_print: number;
  currency: string;
  status: string;
  page_count: number;
  cover_image_path: string;
  cover_image_url: string;
  created_at: string;
  updated_at: string;
  pages: StoryPage[];
  target_gender?: string;
  min_age?: number;
  max_age?: number;
  highlight?: "latest" | "best_seller" | "popular" | string | null;
  in_hero_carousel?: boolean;
  hardcover_cover_image_path?: string;
  hardcover_cover_image_url?: string;
  hardcover_cover_face_points?: string;
}

export function isLogoStory(story?: {
  title?: string | null;
  slug?: string | null;
  category?: string | null;
  cover_image_url?: string | null;
  cover_image_path?: string | null;
  is_logo?: boolean | null;
} | null): boolean {
  if (!story) return false;
  if (story.is_logo) return true;
  const title = (story.title || "").trim().toLowerCase();
  const slug = (story.slug || "").trim().toLowerCase();
  const category = (story.category || "").trim().toLowerCase();
  const cover = ((story.cover_image_url || "") + " " + (story.cover_image_path || "")).toLowerCase();

  return (
    title === "." ||
    title === ".." ||
    title === "logo" ||
    title === "kuttystory" ||
    title === "kutty story" ||
    title === "kuttystory logo" ||
    title === "kutty story logo" ||
    title.includes("logo") ||
    slug === "logo" ||
    slug.includes("logo") ||
    category === "logo" ||
    category === "brand" ||
    cover.includes("logo")
  );
}

export interface CreateBookPayload {
  title: string;
  slug?: string;
  category: string;
  min_age: number;
  max_age: number;
  age_range?: string;
  price_digital: number;
  price_print: number;
  currency?: string;
  page_count: number;
  description?: string;
  cover_image_url?: string;
  cover_image_path?: string;
  status?: string;
  highlight?: "latest" | "best_seller" | "popular" | string | null;
  in_hero_carousel?: boolean;
  hardcover_cover_image_path?: string;
  hardcover_cover_image_url?: string;
  hardcover_cover_face_points?: string;
}

export interface GeneratedAsset {
  id: string;
  job_id: string;
  story_page_id: string;
  page_number: number;
  asset_version: number;
  storage_path: string;
  image_url: string;
  provider?: string;
  model?: string;
  prompt_used: string;
  story_text?: string;
  text_x?: number;
  text_y?: number;
  font_size?: number;
  font_family?: string;
  font_color?: string;
  has_background_box?: boolean;
  box_bg_color?: string;
  box_border_color?: string;
  box_border_width?: number;
  box_bg_opacity?: number;
  text_align?: string;
  box_layout?: string;
  box_border_radius?: number;
  generation_status: string;
  review_status: string;
  cost_estimate?: number;
  generation_time_sec?: number;
  error_message?: string;
  created_at: string;
}

export interface PersonalizationJob {
  id: string;
  user_id?: string;
  story_id: string;
  story_title?: string;
  story_slug?: string;
  child_name: string;
  photo_path: string;
  photo_url: string;
  outfit_mode?: string;
  language?: string;
  status: string;
  current_stage: string;
  total_pages: number;
  completed_pages: number;
  failed_pages: number;
  retry_count: number;
  error_details?: string;
  created_at: string;
  updated_at: string;
  pages_label?: string;
  is_purchased?: boolean;
  is_paid?: boolean;
  paid_at?: string;
  created_formatted?: string;
  pdf_download_url?: string;
  print_pdf_url?: string;
  format_type?: string;
  cover_asset_path?: string;
  cover_asset_url?: string;
  cover_download_url?: string;
  assets: GeneratedAsset[];
}

export interface AISettings {
  active_story_provider: string;
  active_image_provider: string;
  active_model: string;
  preview_page_limit: number;
  max_retries: number;
  concurrency_limit: number;
  per_book_budget: number;
  is_paid_enabled: boolean;
  hardware_acceleration: string;
}

export interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email?: string;
  book_id?: string;
  job_id?: string;
  format_type: string;
  amount: number;
  currency: string;
  status: string;
  payment_status: string;
  payment_intent_id?: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  shipping_address?: string;
  tracking_number?: string;
  shipping_carrier?: string;
  tracking_url?: string;
  shipped_at?: string;
  created_at: string;
}

export interface PaymentTransaction {
  id: string;
  order_id?: string;
  job_id?: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  amount: number;
  currency: string;
  status: string;
  method?: string;
  customer_name?: string;
  customer_email?: string;
  format_type: string;
  story_title?: string;
  child_name?: string;
  order_number?: string;
  error_description?: string;
  created_at: string;
}

export interface AdminDashboardData {
  revenue: number;
  revenue_formatted: string;
  currency_symbol: string;
  currency: string;
  paid_orders: number;
  previews_created: number;
  live_stories: number;
  recent_orders: Order[];
  status_counts: Record<string, number>;
}

export function getAdminHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("kutty_admin_token") : null;
  const headers: Record<string, string> = { ...extra };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Intercepted fetch for Admin requests.
 * Automatically attaches Authorization header if not already present.
 * If 401 Unauthorized is returned, clears credentials and redirects to /admin_login?reason=session_expired.
 * If 403 Forbidden is returned, throws an administrative permission error.
 */
export async function adminFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const token = typeof window !== "undefined" ? localStorage.getItem("kutty_admin_token") : null;
  const reqHeaders = new Headers(init?.headers || {});
  if (token && !reqHeaders.has("Authorization")) {
    reqHeaders.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(input, {
    ...init,
    headers: reqHeaders,
  });

  if (res.status === 401) {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("kutty_admin_token");
        localStorage.removeItem("kutty_admin_user");
        localStorage.removeItem("kutty_admin_last_activity");
      } catch {}
      if (!window.location.pathname.includes("/admin_login")) {
        window.location.href = `/admin_login?reason=session_expired`;
      }
    }
    throw new Error("Admin session expired. Please log in again.");
  }

  if (res.status === 403) {
    throw new Error("Access denied: Administrative privileges required.");
  }

  return res;
}

export const api = {
  apiBase: API_BASE,
  resolveUrl: resolveBackendUrl,

  async getStories(): Promise<StoryTemplate[]> {
    const res = await fetch(`${API_BASE}/stories`);
    if (!res.ok) throw new Error("Failed to fetch stories");
    return res.json();
  },

  async getStory(slugOrId: string): Promise<StoryTemplate> {
    const res = await fetch(`${API_BASE}/stories/${slugOrId}`);
    if (!res.ok) throw new Error("Failed to fetch story details");
    return res.json();
  },

  async validatePhoto(fileOrBlob: Blob | File): Promise<any> {
    const formData = new FormData();
    formData.append("photo", fileOrBlob, "upload.jpg");
    const res = await fetch(`${API_BASE}/personalization/validate-photo`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error("Photo validation failed");
    return res.json();
  },

  async enhancePhoto(fileOrBlob: Blob | File): Promise<{
    status: string;
    enhanced_key: string;
    enhanced_url: string;
    enhanced_base64?: string;
  }> {
    const formData = new FormData();
    formData.append("photo", fileOrBlob, "photo.png");
    const res = await fetch(`${API_BASE}/personalization/enhance-photo`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to enhance photo in the Magic Studio. Please try again.");
    }
    return res.json();
  },

  async startPersonalization(formData: FormData): Promise<PersonalizationJob> {
    const res = await fetch(`${API_BASE}/personalization`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to start personalization");
    }
    return res.json();
  },

  async getPersonalizationJob(jobId: string): Promise<PersonalizationJob> {
    const res = await fetch(`${API_BASE}/personalization/${jobId}`);
    if (!res.ok) throw new Error("Failed to fetch job progress");
    return res.json();
  },

  async triggerFullGeneration(jobId: string): Promise<{ status: string; message: string }> {
    const res = await adminFetch(`${API_BASE}/personalization/${jobId}/generate-full`, {
      method: "POST",
    });
    if (!res.ok) throw new Error("Failed to trigger full book generation");
    return res.json();
  },

  async retryAsset(assetId: string): Promise<GeneratedAsset> {
    const res = await fetch(`${API_BASE}/personalization/assets/${assetId}/retry`, {
      method: "POST",
    });
    if (!res.ok) throw new Error("Failed to regenerate page");
    return res.json();
  },

  async getLanguages(): Promise<{ default: string; languages: Array<{ id: string; name: string; native: string; code: string }> }> {
    const res = await fetch(`${API_BASE}/personalization/languages`);
    if (!res.ok) throw new Error("Failed to fetch languages");
    return res.json();
  },

  async translateJob(jobId: string, targetLanguage: string): Promise<{ job_id: string; target_language: string; translations: Record<string, string> }> {
    const res = await fetch(`${API_BASE}/personalization/${jobId}/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target_language: targetLanguage }),
    });
    if (!res.ok) throw new Error("Failed to translate story");
    return res.json();
  },

  async getDashboard(): Promise<AdminDashboardData> {
    const res = await adminFetch(`${API_BASE}/admin/dashboard`, {
      headers: getAdminHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch admin dashboard");
    return res.json();
  },

  async getOrders(params?: { status?: string; search?: string }): Promise<Order[]> {
    const query = new URLSearchParams();
    if (params?.status) query.append("status", params.status);
    if (params?.search) query.append("search", params.search);
    const qs = query.toString();
    const res = await adminFetch(`${API_BASE}/admin/orders${qs ? `?${qs}` : ""}`, {
      headers: getAdminHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch orders");
    return res.json();
  },

  async createOrder(orderData: Partial<Order>): Promise<Order> {
    const res = await adminFetch(`${API_BASE}/admin/orders`, {
      method: "POST",
      headers: getAdminHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(orderData),
    });
    if (!res.ok) throw new Error("Failed to create order");
    return res.json();
  },

  async updateOrderStatus(
    orderId: string,
    status: string,
    shippingDetails?: {
      tracking_number?: string;
      shipping_carrier?: string;
      tracking_url?: string;
    }
  ): Promise<Order> {
    const res = await adminFetch(`${API_BASE}/admin/orders/${orderId}/status`, {
      method: "PATCH",
      headers: getAdminHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        status,
        ...(shippingDetails || {}),
      }),
    });
    if (!res.ok) throw new Error("Failed to update order status");
    return res.json();
  },

  async deleteOrder(orderId: string): Promise<void> {
    const res = await adminFetch(`${API_BASE}/admin/orders/${orderId}`, {
      method: "DELETE",
      headers: getAdminHeaders(),
    });
    if (!res.ok) throw new Error("Failed to delete order");
  },

  async getPaymentConfig(): Promise<{ razorpay_key: string; currency: string }> {
    const res = await fetch(`${API_BASE}/payments/config`);
    if (!res.ok) throw new Error("Failed to load payment config");
    return res.json();
  },

  async validateCoupon(code: string, format_type: string = "digital"): Promise<{
    valid: boolean;
    code: string;
    discount_percent: number;
    original_amount: number;
    discount_amount: number;
    discounted_amount: number;
    message: string;
  }> {
    const res = await fetch(`${API_BASE}/payments/validate-coupon`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, format_type }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to validate coupon code");
    }
    return res.json();
  },

  async createPaymentOrder(payload: {
    job_id: string;
    format_type: "digital" | "print_hardcover";
    shipping_address?: any;
    customer_name?: string;
    customer_email?: string;
    customer_phone?: string;
    coupon_code?: string;
    language?: string;
    is_gift_wrap?: boolean;
  }): Promise<{
    razorpay_order_id: string;
    amount: number;
    currency: string;
    razorpay_key: string;
    amount_display: number;
    format_type: string;
    story_title: string;
    child_name: string;
    discount_amount?: number;
    coupon_code?: string;
    original_amount?: number;
    language_surcharge?: number;
    gift_wrap_fee?: number;
    is_gift_wrap?: boolean;
  }> {
    const res = await fetch(`${API_BASE}/payments/create-order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to initiate payment");
    }
    return res.json();
  },

  async verifyPayment(payload: {
    job_id: string;
    format_type: string;
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    shipping_address?: any;
    customer_name?: string;
    customer_email?: string;
    customer_phone?: string;
    coupon_code?: string;
    language?: string;
    is_gift_wrap?: boolean;
  }): Promise<{
    success: boolean;
    order_number: string;
    order_id: string;
    job_id: string;
    format_type: string;
    amount: number;
    status: string;
    message: string;
  }> {
    const res = await fetch(`${API_BASE}/payments/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Payment verification failed");
    }
    return res.json();
  },

  async getPaymentTransactions(): Promise<PaymentTransaction[]> {
    const res = await adminFetch(`${API_BASE}/payments/transactions`, {
      headers: getAdminHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch payment transactions");
    return res.json();
  },

  async reseedDashboard(): Promise<{ status: string; message: string }> {
    const res = await adminFetch(`${API_BASE}/admin/seed`, {
      method: "POST",
      headers: getAdminHeaders(),
    });
    if (!res.ok) throw new Error("Failed to reseed database");
    return res.json();
  },

  async getAdminStats() {
    const res = await adminFetch(`${API_BASE}/admin/stats`, {
      headers: getAdminHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch admin stats");
    return res.json();
  },

  async getAdminStories(): Promise<StoryTemplate[]> {
    const res = await adminFetch(`${API_BASE}/admin/stories`, {
      headers: getAdminHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch admin stories");
    return res.json();
  },

  async createAdminStory(data: CreateBookPayload, pdfFile?: File | null): Promise<StoryTemplate> {
    if (pdfFile) {
      const formData = new FormData();
      formData.append("title", data.title);
      if (data.slug) formData.append("slug", data.slug);
      formData.append("category", data.category);
      formData.append("min_age", String(data.min_age));
      formData.append("max_age", String(data.max_age));
      if (data.age_range) formData.append("age_range", data.age_range);
      formData.append("price_digital", String(data.price_digital));
      formData.append("price_print", String(data.price_print));
      formData.append("currency", data.currency || "INR");
      formData.append("page_count", String(data.page_count));
      if (data.description) formData.append("description", data.description);
      if (data.cover_image_url) formData.append("cover_image_url", data.cover_image_url);
      formData.append("pdf_file", pdfFile);

      const res = await adminFetch(`${API_BASE}/admin/stories/upload`, {
        method: "POST",
        headers: getAdminHeaders(),
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to import story from PDF");
      }
      return res.json();
    }

    const res = await adminFetch(`${API_BASE}/admin/stories`, {
      method: "POST",
      headers: getAdminHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to create book");
    }
    return res.json();
  },

  async updateAdminStory(storyId: string, data: Partial<StoryTemplate>): Promise<StoryTemplate> {
    const res = await adminFetch(`${API_BASE}/admin/stories/${storyId}`, {
      method: "PUT",
      headers: getAdminHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update story");
    return res.json();
  },

  async toggleStoryStatus(storyId: string): Promise<StoryTemplate> {
    const res = await adminFetch(`${API_BASE}/admin/stories/${storyId}/toggle-status`, {
      method: "PATCH",
      headers: getAdminHeaders(),
    });
    if (!res.ok) throw new Error("Failed to toggle story status");
    return res.json();
  },

  async deleteAdminStory(storyId: string): Promise<{ status: string; message: string }> {
    const res = await adminFetch(`${API_BASE}/admin/stories/${storyId}`, {
      method: "DELETE",
      headers: getAdminHeaders(),
    });
    if (!res.ok) {
      let errDetail = "Failed to delete story";
      try {
        const errJson = await res.json();
        if (errJson && errJson.detail) errDetail = errJson.detail;
      } catch {}
      throw new Error(errDetail);
    }
    return res.json();
  },

  async getJobs(): Promise<PersonalizationJob[]> {
    const res = await adminFetch(`${API_BASE}/admin/jobs`, {
      headers: getAdminHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch jobs");
    return res.json();
  },

  async translateAdminText(
    text: string,
    targetLang: string = "all",
    childName?: string
  ): Promise<{ translations: Record<string, string> }> {
    const res = await adminFetch(`${API_BASE}/admin/translate`, {
      method: "POST",
      headers: getAdminHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        text,
        target_lang: targetLang,
        child_name: childName,
      }),
    });
    if (!res.ok) throw new Error("Failed to translate text");
    return res.json();
  },

  async updateStoryPage(pageId: string, data: Partial<StoryPage>): Promise<StoryPage> {
    const res = await adminFetch(`${API_BASE}/admin/pages/${pageId}`, {
      method: "PUT",
      headers: getAdminHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update story page");
    return res.json();
  },

  async uploadPageBaseArt(pageId: string, file: File): Promise<StoryPage> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await adminFetch(`${API_BASE}/admin/pages/${pageId}/upload-base-art`, {
      method: "POST",
      headers: getAdminHeaders(),
      body: formData,
    });
    if (!res.ok) throw new Error("Failed to upload base illustration");
    return res.json();
  },

  async uploadCoverPage(storyId: string, file: File): Promise<StoryTemplate> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await adminFetch(`${API_BASE}/admin/stories/${storyId}/upload-cover-page`, {
      method: "POST",
      headers: getAdminHeaders(),
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to upload cover page");
    }
    return res.json();
  },

  async autoTraceCoverPage(storyId: string): Promise<StoryTemplate> {
    const res = await adminFetch(`${API_BASE}/admin/stories/${storyId}/auto-trace-cover`, {
      method: "POST",
      headers: getAdminHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to auto-trace cover page");
    }
    return res.json();
  },

  getCoverDownloadUrl(jobId: string, format: "pdf" | "image" = "pdf", isAdmin: boolean = false): string {
    const token = typeof window !== "undefined" ? localStorage.getItem("kutty_admin_token") : "";
    return `${API_BASE}/personalization/${jobId}/cover-page?format=${format}${isAdmin && token ? `&token=${token}` : ""}`;
  },

  async autoTracePage(pageId: string): Promise<StoryPage> {
    const res = await adminFetch(`${API_BASE}/admin/pages/${pageId}/auto-trace`, {
      method: "POST",
      headers: getAdminHeaders(),
    });
    if (!res.ok) throw new Error("Failed to auto-trace page");
    return res.json();
  },

  async autoTraceAllPages(storyId: string): Promise<{ status: string; message: string; count: number }> {
    const res = await adminFetch(`${API_BASE}/admin/stories/${storyId}/auto-trace-all`, {
      method: "POST",
      headers: getAdminHeaders(),
    });
    if (!res.ok) throw new Error("Failed to auto-trace all pages");
    return res.json();
  },

  async addStoryPage(storyId: string, data: Partial<StoryPage>): Promise<StoryPage> {
    const res = await adminFetch(`${API_BASE}/admin/stories/${storyId}/pages`, {
      method: "POST",
      headers: getAdminHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to add page");
    return res.json();
  },

  async setPageRole(storyId: string, pageId: string, role: "front_cover" | "back_cover"): Promise<StoryTemplate> {
    const res = await adminFetch(`${API_BASE}/admin/stories/${storyId}/set-page-role`, {
      method: "POST",
      headers: getAdminHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ page_id: pageId, role }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to update page role");
    }
    return res.json();
  },

  async deleteStoryPage(pageId: string): Promise<{ status: string; message: string }> {
    const res = await adminFetch(`${API_BASE}/admin/pages/${pageId}`, {
      method: "DELETE",
      headers: getAdminHeaders(),
    });
    if (!res.ok) throw new Error("Failed to delete page");
    return res.json();
  },

  async compareProviders(file?: File, presets?: string): Promise<{
    status: string;
    message: string;
    results: { provider: string; cost: string; url: string }[];
  }> {
    const formData = new FormData();
    if (file) formData.append("file", file);
    if (presets) formData.append("presets", presets);
    const res = await adminFetch(`${API_BASE}/admin/compare-providers`, {
      method: "POST",
      headers: getAdminHeaders(),
      body: formData,
    });
    if (!res.ok) throw new Error("Failed to run provider comparison");
    return res.json();
  },

  async testRenderBook(data: { story_id: string; child_name: string; photo?: File }): Promise<PersonalizationJob> {
    const formData = new FormData();
    formData.append("story_id", data.story_id);
    formData.append("child_name", data.child_name);
    if (data.photo) formData.append("photo", data.photo);
    const res = await adminFetch(`${API_BASE}/personalization/test-render`, {
      method: "POST",
      headers: getAdminHeaders(),
      body: formData,
    });
    if (!res.ok) throw new Error("Failed to create test render");
    return res.json();
  },

  async reviewAsset(assetId: string, reviewStatus: "approved" | "rejected") {
    const res = await adminFetch(`${API_BASE}/admin/assets/${assetId}/review`, {
      method: "POST",
      headers: getAdminHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ review_status: reviewStatus }),
    });
    if (!res.ok) throw new Error("Failed to update review status");
    return res.json();
  },

  async getAISettings(): Promise<AISettings> {
    const res = await adminFetch(`${API_BASE}/admin/ai/settings`, {
      headers: getAdminHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch settings");
    return res.json();
  },

  async updateAISettings(data: Partial<AISettings>): Promise<AISettings> {
    const res = await adminFetch(`${API_BASE}/admin/ai/settings`, {
      method: "PUT",
      headers: getAdminHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update settings");
    return res.json();
  },

  async registerAdmin(data: {
    name: string;
    phone?: string;
    email: string;
    password: string;
    confirm_password: string;
  }): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to create account");
    }
    return res.json();
  },

  async loginAdmin(data: { username: string; password: string }): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Invalid username or password");
    }
    return res.json();
  },

  async forgotPassword(email: string): Promise<ForgotPasswordResponse> {
    const res = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to request password reset");
    }
    return res.json();
  },

  async resetPassword(data: {
    email: string;
    code: string;
    new_password: string;
    confirm_password: string;
  }): Promise<{ status: string; message: string }> {
    const res = await fetch(`${API_BASE}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to reset password");
    }
    return res.json();
  },

  async getCurrentUser(token?: string): Promise<UserProfile> {
    const authToken = token || localStorage.getItem("kutty_admin_token");
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    });
    if (!res.ok) throw new Error("Not authenticated");
    return res.json();
  },

  async getChildStories(category?: string, search?: string): Promise<ChildStory[]> {
    const params = new URLSearchParams();
    if (category && category.toLowerCase() !== "all" && category.toLowerCase() !== "all stories") {
      params.append("category", category);
    }
    if (search) params.append("search", search);
    const qs = params.toString() ? `?${params.toString()}` : "";
    const res = await fetch(`${API_BASE}/child-stories${qs}`);
    if (!res.ok) throw new Error("Failed to fetch child stories");
    return res.json();
  },

  async submitChildStory(payload: SubmitChildStoryPayload): Promise<{ status: string; message: string; story: ChildStory }> {
    const res = await fetch(`${API_BASE}/child-stories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to submit story");
    }
    return res.json();
  },

  async likeChildStory(storyId: string): Promise<{ status: string; likes_count: number }> {
    const res = await fetch(`${API_BASE}/child-stories/${storyId}/like`, {
      method: "POST",
    });
    if (!res.ok) throw new Error("Failed to like story");
    return res.json();
  },

  async getAllChildStoriesAdmin(status?: string): Promise<ChildStory[]> {
    const qs = status && status.toLowerCase() !== "all" ? `?status=${status}` : "";
    const res = await adminFetch(`${API_BASE}/child-stories/admin/all${qs}`, {
      headers: getAdminHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch admin child stories");
    return res.json();
  },

  async updateChildStoryAdmin(storyId: string, updates: Partial<ChildStory>): Promise<{ status: string; story_id: string; current_status: string }> {
    const res = await adminFetch(`${API_BASE}/child-stories/admin/${storyId}`, {
      method: "PATCH",
      headers: getAdminHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error("Failed to update story");
    return res.json();
  },

  async deleteChildStoryAdmin(storyId: string): Promise<{ status: string }> {
    const res = await adminFetch(`${API_BASE}/child-stories/admin/${storyId}`, {
      method: "DELETE",
      headers: getAdminHeaders(),
    });
    if (!res.ok) throw new Error("Failed to delete story");
    return res.json();
  },

  // Customer Feedback Methods
  async submitFeedback(payload: SubmitFeedbackPayload): Promise<FeedbackItem> {
    const formData = new FormData();
    formData.append("name", payload.name);
    formData.append("place", payload.place);
    formData.append("rating", payload.rating.toString());
    if (payload.review_text !== undefined && payload.review_text !== null) {
      formData.append("review_text", payload.review_text);
    }
    if (payload.file) {
      formData.append("file", payload.file);
    }

    const res = await fetch(`${API_BASE}/feedbacks`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to submit feedback");
    }
    return res.json();
  },

  async getApprovedFeedbacks(): Promise<FeedbackItem[]> {
    const res = await fetch(`${API_BASE}/feedbacks/approved`);
    if (!res.ok) throw new Error("Failed to fetch approved feedbacks");
    return res.json();
  },

  async getAdminFeedbacks(status?: string, search?: string): Promise<FeedbackItem[]> {
    const params = new URLSearchParams();
    if (status && status !== "all") params.append("status", status);
    if (search && search.trim()) params.append("search", search.trim());
    const token = authService.getToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await adminFetch(`${API_BASE}/admin/feedbacks?${params.toString()}`, { headers });
    if (!res.ok) throw new Error("Failed to fetch admin feedbacks");
    return res.json();
  },

  async updateFeedbackStatus(feedbackId: string, status: "pending" | "approved" | "rejected"): Promise<FeedbackItem> {
    const token = authService.getToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await adminFetch(`${API_BASE}/admin/feedbacks/${feedbackId}/status`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error("Failed to update feedback status");
    return res.json();
  },

  async editFeedback(feedbackId: string, updates: Partial<FeedbackItem>): Promise<FeedbackItem> {
    const token = authService.getToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await adminFetch(`${API_BASE}/admin/feedbacks/${feedbackId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error("Failed to edit feedback");
    return res.json();
  },

  async deleteFeedback(feedbackId: string): Promise<{ status: string; message: string }> {
    const token = authService.getToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await adminFetch(`${API_BASE}/admin/feedbacks/${feedbackId}`, {
      method: "DELETE",
      headers,
    });
    if (!res.ok) throw new Error("Failed to delete feedback");
    return res.json();
  },

  async getAnnouncement(): Promise<AnnouncementSettings> {
    try {
      const res = await fetch(`${API_BASE}/settings/announcement`);
      if (!res.ok) throw new Error("Failed to fetch announcement");
      return await res.json();
    } catch {
      return {
        is_active: true,
        badge: "WELCOME OFFER",
        text: "Get 20% off your child's first personalized storybook with code WELCOME20",
        link_label: "Claim Offer",
        link_url: "/storybooks",
        coupon_code: "WELCOME20",
      };
    }
  },

  async updateAnnouncement(data: Partial<AnnouncementSettings>): Promise<AnnouncementSettings> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const token = authService.getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await adminFetch(`${API_BASE}/admin/settings/announcement`, {
      method: "PUT",
      headers,
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update announcement");
    return res.json();
  },

  async getPublicKuttysStories(): Promise<KuttysStoryItem[]> {
    const res = await fetch(`${API_BASE}/kuttys-stories`);
    if (!res.ok) throw new Error("Failed to fetch Kutty's stories");
    return res.json();
  },

  async getAdminKuttysStories(): Promise<KuttysStoryItem[]> {
    const token = authService.getToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await adminFetch(`${API_BASE}/admin/kuttys-stories`, { headers });
    if (!res.ok) throw new Error("Failed to fetch admin Kutty's stories");
    return res.json();
  },

  async createKuttysStory(story: Partial<KuttysStoryItem>): Promise<KuttysStoryItem> {
    const token = authService.getToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await adminFetch(`${API_BASE}/admin/kuttys-stories`, {
      method: "POST",
      headers,
      body: JSON.stringify(story),
    });
    if (!res.ok) throw new Error("Failed to create Kutty's story");
    return res.json();
  },

  async updateKuttysStory(storyId: string, story: Partial<KuttysStoryItem>): Promise<KuttysStoryItem> {
    const token = authService.getToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await adminFetch(`${API_BASE}/admin/kuttys-stories/${storyId}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(story),
    });
    if (!res.ok) throw new Error("Failed to update Kutty's story");
    return res.json();
  },

  async deleteKuttysStory(storyId: string): Promise<{ status: string; message: string }> {
    const token = authService.getToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await adminFetch(`${API_BASE}/admin/kuttys-stories/${storyId}`, {
      method: "DELETE",
      headers,
    });
    if (!res.ok) throw new Error("Failed to delete Kutty's story");
    return res.json();
  },

  async resetKuttysStoriesDefaults(): Promise<{ status: string; stories: KuttysStoryItem[] }> {
    const token = authService.getToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await adminFetch(`${API_BASE}/admin/kuttys-stories/reset-defaults`, {
      method: "POST",
      headers,
    });
    if (!res.ok) throw new Error("Failed to reset Kutty's stories defaults");
    return res.json();
  },

  async likeKuttysStory(storyId: string): Promise<{ status: string; message: string }> {
    const res = await fetch(`${API_BASE}/kuttys-stories/${storyId}/like`, {
      method: "POST",
    });
    if (!res.ok) throw new Error("Failed to react to story");
    return res.json();
  },

  async getAvailableKuttysBooks(): Promise<{ title: string; slug: string; category: string }[]> {
    try {
      const token = authService.getToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await adminFetch(`${API_BASE}/admin/kuttys-stories-books`, { headers });
      if (!res.ok) throw new Error("Failed to fetch books list");
      return res.json();
    } catch {
      return [];
    }
  },

  async getParentingRoutine(): Promise<ParentingRoutineStage[]> {
    const res = await fetch(`${API_BASE}/parenting-routine`);
    if (!res.ok) throw new Error("Failed to fetch parenting routine");
    return res.json();
  },

  async updateParentingRoutine(stages: ParentingRoutineStage[]): Promise<{ status: string; message: string }> {
    const token = authService.getToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await adminFetch(`${API_BASE}/admin/parenting-routine`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ stages }),
    });
    if (!res.ok) throw new Error("Failed to update parenting routine");
    return res.json();
  },

  async resetParentingRoutine(): Promise<{ status: string; message: string }> {
    const token = authService.getToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await adminFetch(`${API_BASE}/admin/parenting-routine/reset-defaults`, {
      method: "POST",
      headers,
    });
    if (!res.ok) throw new Error("Failed to reset parenting routine");
    return res.json();
  },
};

export interface ParentingRoutineStage {
  id: string;
  time: string;
  start_hour: number;
  end_hour: number;
  activity: string;
  parenting_idea: string;
  category: "morning" | "day" | "evening" | "night";
  icon: string;
  character: "boy" | "girl";
}

export interface KuttysStoryItem {
  id: string;
  child_name: string;
  child_age: string;
  child_title?: string;
  city?: string;
  storybook_title?: string;
  storybook_slug?: string;
  kid_quote: string;
  parent_note?: string;
  avatar_preset?: string;
  avatar_url?: string;
  stars?: number;
  rating_label?: string;
  badge?: string;
  accent_color?: string;
  is_active?: boolean;
  display_order?: number;
  likes_count?: number;
}

export interface NoticeItem {
  id?: string;
  badge?: string;
  text: string;
  link_label?: string;
  link_url?: string;
  coupon_code?: string;
}

export interface AnnouncementSettings {
  is_active: boolean;
  badge?: string;
  text: string;
  link_label?: string;
  link_url?: string;
  coupon_code?: string;
  notices?: NoticeItem[];
  default_pdf_price?: number;
  default_hardcover_price?: number;
  regional_language_surcharge?: number;
  gift_wrap_fee?: number;
  gift_wrap_enabled?: boolean;
}


export interface ChildStory {
  id: string;
  child_name: string;
  standard: string;
  place: string;
  title: string;
  story_text: string;
  category: string;
  cover_color: string;
  parent_email?: string;
  status: "approved" | "pending" | "featured" | "rejected";
  likes_count: number;
  created_at?: string;
  updated_at?: string;
}

export interface SubmitChildStoryPayload {
  child_name: string;
  standard: string;
  place: string;
  title: string;
  story_text: string;
  category?: string;
  cover_color?: string;
  parent_email?: string;
}

export interface FeedbackItem {
  id: string;
  name: string;
  place: string;
  rating: number;
  review_text?: string;
  media_url?: string;
  media_type?: "image" | "video";
  status: "pending" | "approved" | "rejected";
  created_at: string;
  updated_at: string;
}

export interface SubmitFeedbackPayload {
  name: string;
  place: string;
  rating: number;
  review_text?: string;
  file?: File | null;
}


export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: UserProfile;
}

export interface ForgotPasswordResponse {
  status: string;
  message: string;
  email: string;
  smtp_sent: boolean;
}

// Admin session idle timeout (60 minutes)
const ADMIN_SESSION_TIMEOUT_MS = 60 * 60 * 1000;

export const authService = {
  saveSession(token: string, user: UserProfile) {
    localStorage.setItem("kutty_admin_token", token);
    localStorage.setItem("kutty_admin_user", JSON.stringify(user));
    localStorage.setItem("kutty_admin_last_activity", Date.now().toString());
  },
  recordActivity() {
    if (localStorage.getItem("kutty_admin_token")) {
      localStorage.setItem("kutty_admin_last_activity", Date.now().toString());
    }
  },
  isSessionExpired(): boolean {
    const token = localStorage.getItem("kutty_admin_token");
    if (!token) return false;
    const last = localStorage.getItem("kutty_admin_last_activity");
    if (!last) return true; // Missing timestamp -> enforce fresh login for security
    const diff = Date.now() - parseInt(last, 10);
    return isNaN(diff) || diff > ADMIN_SESSION_TIMEOUT_MS;
  },
  getUser(): UserProfile | null {
    if (this.isSessionExpired()) {
      this.logout();
      return null;
    }
    try {
      const str = localStorage.getItem("kutty_admin_user");
      return str ? JSON.parse(str) : null;
    } catch {
      return null;
    }
  },
  getToken(): string | null {
    if (this.isSessionExpired()) {
      this.logout();
      return null;
    }
    return localStorage.getItem("kutty_admin_token");
  },
  isAuthenticated(): boolean {
    if (this.isSessionExpired()) {
      this.logout();
      return false;
    }
    return !!localStorage.getItem("kutty_admin_token");
  },
  logout() {
    localStorage.removeItem("kutty_admin_token");
    localStorage.removeItem("kutty_admin_user");
    localStorage.removeItem("kutty_admin_last_activity");
  },
};
