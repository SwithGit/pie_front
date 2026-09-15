export interface PublicGallery {
  code: string; title: string; creator: string; description: string;
  thumbnailUrls: string[]; startDate: string | null; endDate: string | null;
  alwaysOpen: boolean; views: number; likes: number;
}
export interface GalleryPage { galleries: PublicGallery[]; page: number; totalPages: number; totalItems: number; }
export interface GallerySession {
  schemaVersion: "1"; campaignId: string; galleryCode: string; entitlementId: string;
  nickname: string; dropId: string; tier: "MAIN";
}
const base = (process.env.REACT_APP_API_BASE_URL || "https://www.pieback.com").replace(/\/$/, "");
async function request<T>(path: string, signal?: AbortSignal, body?: unknown): Promise<T> {
  const response = await fetch(`${base}/api/public/galleries${path}`, {
    signal, method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error?.message || `전시 정보를 불러오지 못했어요. (${response.status})`);
  if (!data) throw new Error("전시 서버의 응답을 읽지 못했어요.");
  return data;
}
export function listPublicGalleries(page: number, order: string, search: string, signal?: AbortSignal) {
  return request<GalleryPage>(`?${new URLSearchParams({ page: String(page), order, q: search })}`, signal);
}
export function openPublicGallery(code: string, signal?: AbortSignal) {
  return request<{ gallery: PublicGallery; session: GallerySession }>(`/${encodeURIComponent(code)}/session`, signal, {});
}
