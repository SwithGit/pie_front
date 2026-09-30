import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import DesktopLogin from "./DesktopLogin";
import authReducer from "../../redux/authSlice";
import { safeLoginNext } from "../../utils/safeLoginNext";

jest.mock("../../api/api", () => ({ API_BASE_URL: "https://www.pieback.com" }));

const requestId = "a".repeat(64);
const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; localStorage.clear(); });
function Location() { const location = useLocation(); return <div data-testid="location">{location.pathname}{location.search}</div>; }
function show(token: string | null, request = requestId) {
  const store = configureStore({ reducer: { auth: authReducer }, preloadedState: { auth: { id: token ? "google_user" : null, token, isLoggedIn: !!token } } });
  render(<Provider store={store}><MemoryRouter initialEntries={[`/desktop-login?request=${request}`]}><Routes>
    <Route path="/desktop-login" element={<DesktopLogin />} /><Route path="/signin" element={<Location />} />
  </Routes></MemoryRouter></Provider>);
}
test("a logged-in browser must explicitly approve before the PC receives a login", async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ success: true }) });
  show("web-session");
  expect(screen.getByText("AAAAAA")).toBeInTheDocument();
  expect(global.fetch).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "이 계정으로 PC 로그인" }));
  await screen.findByText("PC 앱으로 돌아가 주세요");
  expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining("/auth/desktop/approve"), expect.objectContaining({
    method: "POST", headers: expect.objectContaining({ Authorization: "Bearer web-session" }), body: JSON.stringify({ requestId })
  }));
});
test("password/social login returns to the same PC request", () => {
  show(null);
  fireEvent.click(screen.getByRole("button", { name: "로그인하고 연결하기" }));
  const next = `/desktop-login?request=${requestId}`;
  expect(screen.getByTestId("location").textContent).toBe(`/signin?next=${encodeURIComponent(next)}`);
  expect(safeLoginNext(next)).toBe(next);
  for (const value of [next + "&redirect=https://evil.test", "/desktop-login?request=invalid", "//evil.test/desktop-login", next + "#fragment"])
    expect(safeLoginNext(value)).toBe("/");
});
test("expired requests show a retry instruction instead of a success screen", async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 410 });
  show("web-session");
  fireEvent.click(screen.getByRole("button", { name: "이 계정으로 PC 로그인" }));
  await screen.findByRole("alert");
  expect(screen.queryByText("PC 앱으로 돌아가 주세요")).not.toBeInTheDocument();
});
test("an expired browser session goes through login again with the PC request preserved", async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401 });
  show("expired");
  fireEvent.click(screen.getByRole("button", { name: "이 계정으로 PC 로그인" }));
  await waitFor(() => expect(screen.getByTestId("location").textContent).toContain("/signin?next="));
});
test("invalid request does not offer an approval action", () => {
  show("web-session", "invalid");
  expect(screen.getByRole("alert")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "이 계정으로 PC 로그인" })).not.toBeInTheDocument();
});
