export interface PublicGallery {
  code: string; title: string; creator: string; description: string;
  thumbnailUrls: string[]; startDate: string | null; endDate: string | null;
  alwaysOpen: boolean; views: number; likes: number;
  category?: string; tags?: string[]; featured?: boolean; featureOrder?: number;
  editorialNote?: string; shareImageUrl?: string;
}
export interface GalleryPage { galleries: PublicGallery[]; page: number; totalPages: number; totalItems: number; }
export interface GallerySession {
  schemaVersion: "1"; campaignId: string; galleryCode: string; entitlementId: string;
  nickname: string; dropId: string; tier: "MAIN";
}
export const exhibitionCategories = [
  { id: "brand", label: "브랜드 팝업" }, { id: "art", label: "예술·전시" },
  { id: "school", label: "학교·졸업전시" }, { id: "showroom", label: "제품 쇼룸" },
  { id: "culture", label: "문화·이벤트" }, { id: "other", label: "기타 공간" },
];
export interface DiscoveryData {
  featured: PublicGallery[]; popular: PublicGallery[]; latest: PublicGallery[]; ending: PublicGallery[]; totalItems: number;
}
export interface Curation {
  category: string; tags: string[]; featured: boolean; featureOrder: number; editorialNote: string; shareImageUrl: string;
}
const base = (process.env.REACT_APP_API_BASE_URL || "https://www.pieback.com").replace(/\/$/, "");
async function request<T>(path: string, signal?: AbortSignal, body?: unknown, admin = false, method?: string): Promise<T> {
  const response = await fetch(`${base}/api/public/galleries${path}`, {
    signal, method: method || (body === undefined ? "GET" : "POST"),
    headers: { ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(admin ? { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body), cache: "no-store",
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error?.message || `전시 정보를 불러오지 못했어요. (${response.status})`);
  if (!data) throw new Error("전시 서버의 응답을 읽지 못했어요.");
  return data;
}
export function listPublicGalleries(page: number, order: string, search: string, signal?: AbortSignal, category = "", tag = "") {
  return request<GalleryPage>(`?${new URLSearchParams({ page: String(page), order, q: search, category, tag })}`, signal);
}
export const getDiscoveryHome = (signal?: AbortSignal) => request<DiscoveryData>("/home", signal);
export const getPublicGallery = (code: string, signal?: AbortSignal) => request<{ gallery: PublicGallery }>(`/${encodeURIComponent(code)}`, signal);
export function openPublicGallery(code: string, signal?: AbortSignal) {
  return request<{ gallery: PublicGallery; session: GallerySession }>(`/${encodeURIComponent(code)}/session`, signal, {});
}
export const getCurationAccess = (signal?: AbortSignal) => request<{ isPlatformAdmin: boolean }>("/management/access", signal, undefined, true);
export const getCuratedGallery = (code: string, signal?: AbortSignal) => request<{ gallery: PublicGallery }>(`/management/${encodeURIComponent(code)}`, signal, undefined, true);
export const saveCuration = (code: string, body: Curation) => request<{ success: boolean }>(`/management/${encodeURIComponent(code)}`, undefined, body, true, "PUT");
