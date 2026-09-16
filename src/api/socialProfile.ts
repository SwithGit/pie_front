import { API_BASE_URL } from "./api";
import { SocialLoginResult } from "./socialLogin";
export interface ProfileFields { name: string; nickname: string; email: string; }
export interface ProfileStatus {
  provider: "kakao" | "google";
  profile: ProfileFields;
  missingFields: Array<keyof ProfileFields>;
  requiresProfile: boolean;
}
export class ProfileError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
async function request<T>(token: string, body?: ProfileFields, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_BASE_URL}/auth/web/profile`, {
    method: body ? "POST" : "GET", signal,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
    cache: "no-store",
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new ProfileError(data?.message || "정보를 처리하지 못했습니다. 다시 시도해 주세요.", response.status);
  return data;
}
export const getSocialProfile = (token: string, signal?: AbortSignal) => request<ProfileStatus>(token, undefined, signal);
export const completeSocialProfile = (token: string, profile: ProfileFields) => request<SocialLoginResult>(token, profile);
