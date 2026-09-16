import { API_BASE_URL } from "./api";

export type SocialProvider = "kakao" | "google";
export interface SocialLoginResult { id: string; token: string; requiresProfile?: boolean; }

export function startSocialLogin(provider: SocialProvider): { result: Promise<SocialLoginResult>; cancel: () => void } {
  const requestId = Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, "0")).join("");
  const url = new URL(`${API_BASE_URL}/auth/web/${provider}`);
  url.searchParams.set("requestId", requestId);
  const popup = window.open(url.href, "pie-social-login", "popup,width=500,height=700");
  let cancel = () => {};
  const result = new Promise<SocialLoginResult>((resolve, reject) => {
    if (!popup) { reject(new Error("popup_blocked")); return; }
    let timer: ReturnType<typeof setInterval>;
    const clean = () => { window.removeEventListener("message", onMessage); clearInterval(timer); popup.close(); };
    const fail = (code: string) => { clean(); reject(new Error(code)); };
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== url.origin || event.source !== popup || event.data?.type !== "pie:social-login") return;
      const data = event.data;
      // A missing session cannot echo the request ID, but still comes from this exact popup.
      if (data.error === "invalid_state") { fail("invalid_state"); return; }
      if (data.requestId !== requestId) return;
      if (data.success === true && typeof data.id === "string" && data.id && typeof data.token === "string" && data.token) {
        clean(); resolve({ id: data.id, token: data.token, ...(data.requiresProfile === true ? { requiresProfile: true } : {}) });
      } else { fail(data.error || "login_failed"); }
    };
    window.addEventListener("message", onMessage);
    const started = Date.now();
    timer = setInterval(() => {
      if (popup.closed) fail("popup_closed");
      else if (Date.now() - started > 600000) fail("timeout");
    }, 500);
    cancel = () => fail("cancelled");
  });
  return { result, cancel: () => cancel() };
}
