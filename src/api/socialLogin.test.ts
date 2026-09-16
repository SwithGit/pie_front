import { startSocialLogin } from "./socialLogin";

jest.mock("./api", () => ({ API_BASE_URL: "https://www.pieback.com" }));

beforeEach(() => {
  jest.useFakeTimers();
  Object.defineProperty(globalThis, "crypto", { configurable: true, value: { getRandomValues: (array: Uint8Array) => array.fill(7) } });
});
afterEach(() => { jest.restoreAllMocks(); jest.useRealTimers(); });

function popupFixture() {
  const popup = { closed: false, close: jest.fn() };
  const open = jest.spyOn(window, "open").mockReturnValue(popup as unknown as Window);
  const attempt = startSocialLogin("google");
  const url = new URL(String(open.mock.calls[0][0]));
  const data = { type: "pie:social-login", requestId: url.searchParams.get("requestId"), success: true, id: "social-user", token: "test-token" };
  const message = (origin = url.origin, source: unknown = popup, body = data) => window.dispatchEvent(new MessageEvent("message", { origin, source: source as Window, data: body }));
  return { attempt, popup, data, message, url };
}

test("only the matching popup, backend origin and request can complete login", async () => {
  const f = popupFixture();
  expect(f.url.pathname).toBe("/auth/web/google");
  f.message("https://untrusted.example");
  f.message(f.url.origin, {});
  f.message(f.url.origin, f.popup, { ...f.data, requestId: "wrong-request" });
  expect(f.popup.close).not.toHaveBeenCalled();
  f.message();
  await expect(f.attempt.result).resolves.toEqual({ id: "social-user", token: "test-token" });
  expect(jest.getTimerCount()).toBe(0);
});

test("blocked popup reports an actionable error", async () => {
  jest.spyOn(window, "open").mockReturnValue(null);
  await expect(startSocialLogin("kakao").result).rejects.toThrow("popup_blocked");
});

test("closing the popup releases the listener and timer", async () => {
  const f = popupFixture();
  const check = expect(f.attempt.result).rejects.toThrow("popup_closed");
  f.popup.closed = true;
  jest.advanceTimersByTime(500);
  await check;
  expect(jest.getTimerCount()).toBe(0);
});

test("provider denial and unmount cancellation clear pending login", async () => {
  const f = popupFixture();
  const check = expect(f.attempt.result).rejects.toThrow("access_denied");
  window.dispatchEvent(new MessageEvent("message", { origin: f.url.origin, source: f.popup as unknown as Window, data: { type: "pie:social-login", requestId: f.data.requestId, error: "access_denied" } }));
  await check;
  const next = popupFixture();
  const cancelled = expect(next.attempt.result).rejects.toThrow("cancelled");
  next.attempt.cancel();
  await cancelled;
  expect(jest.getTimerCount()).toBe(0);
});
