import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CompleteProfile from "./CompleteProfile";
import { getSocialProfile, completeSocialProfile, ProfileError } from "../../api/socialProfile";

const mockNavigate = jest.fn();
const mockDispatch = jest.fn();
jest.mock("react-router-dom", () => ({ ...jest.requireActual("react-router-dom"), useNavigate: () => mockNavigate }));
jest.mock("react-redux", () => ({ useDispatch: () => mockDispatch }));
jest.mock("../../api/socialProfile", () => ({
  getSocialProfile: jest.fn(), completeSocialProfile: jest.fn(),
  ProfileError: class extends Error { status: number; constructor(message: string, code: number) { super(message); this.status = code; } },
}));
const getProfile = getSocialProfile as jest.MockedFunction<typeof getSocialProfile>;
const saveProfile = completeSocialProfile as jest.MockedFunction<typeof completeSocialProfile>;
function mount() { return render(<MemoryRouter initialEntries={["/complete-profile?next=/workspaces"]}><CompleteProfile /></MemoryRouter>); }
beforeEach(() => {
  jest.clearAllMocks(); sessionStorage.clear();
  sessionStorage.setItem("socialProfileToken", "onboarding-token");
  getProfile.mockResolvedValue({ provider: "google", profile: { name: "홍길동", nickname: "", email: "test@example.com" }, missingFields: ["nickname"], requiresProfile: true });
});

test("prefills registered data and saves missing fields before logging in", async () => {
  saveProfile.mockResolvedValue({ id: "user", token: "full-token" });
  mount();
  const nickname = await screen.findByLabelText(/닉네임/);
  expect(screen.getByLabelText(/이름/)).toHaveAttribute("readonly");
  expect(screen.getByRole("button", { name: "저장하고 시작하기" })).toBeDisabled();
  expect(mockDispatch).not.toHaveBeenCalled();
  fireEvent.change(nickname, { target: { value: "나의닉네임" } });
  fireEvent.click(screen.getByRole("button", { name: "저장하고 시작하기" }));
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/workspaces", { replace: true }));
  expect(saveProfile).toHaveBeenCalledWith("onboarding-token", { name: "홍길동", nickname: "나의닉네임", email: "test@example.com" });
  expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({ payload: { id: "user", token: "full-token" } }));
  expect(sessionStorage.getItem("socialProfileToken")).toBeNull();
});

test("duplicate nickname keeps input and does not grant login", async () => {
  saveProfile.mockRejectedValue(new ProfileError("이미 사용 중인 닉네임입니다.", 409));
  mount();
  fireEvent.change(await screen.findByLabelText(/닉네임/), { target: { value: "중복닉네임" } });
  fireEvent.click(screen.getByRole("button", { name: "저장하고 시작하기" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("이미 사용 중인 닉네임");
  expect(screen.getByLabelText(/닉네임/)).toHaveValue("중복닉네임");
  expect(mockDispatch).not.toHaveBeenCalled();
  expect(mockNavigate).not.toHaveBeenCalled();
});

test("direct entry without social authentication returns to login", () => {
  sessionStorage.clear(); mount();
  expect(mockNavigate).toHaveBeenCalledWith("/signin?next=%2Fworkspaces", { replace: true });
  expect(getProfile).not.toHaveBeenCalled();
});

test("expired profile authentication cannot submit", async () => {
  getProfile.mockRejectedValue(new ProfileError("인증이 만료되었습니다.", 401));
  mount();
  expect(await screen.findByRole("alert")).toHaveTextContent("인증이 만료");
  expect(saveProfile).not.toHaveBeenCalled();
  expect(mockDispatch).not.toHaveBeenCalled();
});
