import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import WorkspacePage from "./WorkspacePage";
import { getWorkspaces, getWorkspaceMembers, removeWorkspaceMember, decideWorkspaceMember } from "../../api/api";

jest.mock("../../api/api", () => ({
  getWorkspaces: jest.fn(), getWorkspaceMembers: jest.fn(), removeWorkspaceMember: jest.fn(),
  decideWorkspaceMember: jest.fn(), activateWorkspace: jest.fn(), approveCompanyWorkspace: jest.fn(),
  createTeamWorkspace: jest.fn(), getCompanyReviewQueue: jest.fn(), registerCompanyWorkspace: jest.fn(), requestWorkspaceJoin: jest.fn(),
}));
const loadWorkspaces = getWorkspaces as jest.MockedFunction<typeof getWorkspaces>;
const loadMembers = getWorkspaceMembers as jest.MockedFunction<typeof getWorkspaceMembers>;
const removeMember = removeWorkspaceMember as jest.MockedFunction<typeof removeWorkspaceMember>;
const decideMember = decideWorkspaceMember as jest.MockedFunction<typeof decideWorkspaceMember>;
const workspace = { id: "team-1", kind: "team", name: "디자인팀", role: "owner", status: "active", memberStatus: "active" };
const members = [
  { userId: "owner", name: "소유자", nickname: "owner", role: "owner", status: "active" },
  { userId: "editor", name: "김팀원", nickname: "editor", role: "editor", status: "active" },
  { userId: "admin", name: "이관리자", nickname: "admin", role: "admin", status: "active" },
  { userId: "other-admin", name: "박관리자", nickname: "other-admin", role: "admin", status: "active" },
  { userId: "pending", name: "최대기", nickname: "pending", role: "editor", status: "pending" },
];
async function mountMembers() {
  render(<MemoryRouter><WorkspacePage /></MemoryRouter>);
  fireEvent.click(await screen.findByRole("button", { name: "팀원·참여 신청 보기" }));
  await screen.findByText(/김팀원 \(editor\)/);
}
beforeEach(() => {
  jest.clearAllMocks(); localStorage.clear();
  localStorage.setItem("token", "test-token"); localStorage.setItem("id", "owner");
  loadWorkspaces.mockResolvedValue({ workspaces: [workspace] });
  loadMembers.mockResolvedValue({ members });
  removeMember.mockResolvedValue({ success: true });
  decideMember.mockResolvedValue({ success: true });
  jest.spyOn(window, "confirm").mockReturnValue(true);
});
afterEach(() => jest.restoreAllMocks());

test("owner can remove active editors and admins; owner and pending members remain protected", async () => {
  await mountMembers();
  expect(screen.getByRole("button", { name: "김팀원 팀원 삭제" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "이관리자 팀원 삭제" })).toBeEnabled();
  expect(screen.queryByRole("button", { name: "소유자 팀원 삭제" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "최대기 팀원 삭제" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "승인" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "거절" })).toBeEnabled();
});

test("cancelling the confirmation preserves the member and sends no request", async () => {
  (window.confirm as jest.Mock).mockReturnValue(false);
  await mountMembers();
  fireEvent.click(screen.getByRole("button", { name: "김팀원 팀원 삭제" }));
  expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining("디자인팀"));
  expect(removeMember).not.toHaveBeenCalled();
  expect(screen.getByText(/김팀원 \(editor\)/)).toBeInTheDocument();
});

test("successful removal updates only that team's member list", async () => {
  await mountMembers();
  fireEvent.click(screen.getByRole("button", { name: "김팀원 팀원 삭제" }));
  await waitFor(() => expect(removeMember).toHaveBeenCalledWith("team-1", "editor"));
  expect(await screen.findByRole("status")).toHaveTextContent("김팀원님을 팀에서 삭제했습니다.");
  expect(screen.queryByText(/김팀원 \(editor\)/)).not.toBeInTheDocument();
  expect(screen.getByText(/이관리자 \(admin\)/)).toBeInTheDocument();
});

test("permission or server errors preserve the member and re-enable controls", async () => {
  removeMember.mockRejectedValue({ response: { status: 403, data: { err: "관리자 권한이 필요합니다." } } });
  await mountMembers();
  fireEvent.click(screen.getByRole("button", { name: "김팀원 팀원 삭제" }));
  expect(await screen.findByRole("status")).toHaveTextContent("관리자 권한이 필요합니다.");
  expect(screen.getByText(/김팀원 \(editor\)/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "김팀원 팀원 삭제" })).toBeEnabled();
});

test("a non-success response does not remove a row", async () => {
  removeMember.mockResolvedValue({ success: false, err: "삭제할 수 없는 팀원입니다." });
  await mountMembers();
  fireEvent.click(screen.getByRole("button", { name: "김팀원 팀원 삭제" }));
  expect(await screen.findByRole("status")).toHaveTextContent("삭제할 수 없는 팀원입니다.");
  expect(screen.getByText(/김팀원 \(editor\)/)).toBeInTheDocument();
});

test("duplicate clicks and other mutations are blocked until deletion finishes", async () => {
  let finish!: (value: { success: boolean }) => void;
  removeMember.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  await mountMembers();
  const button = screen.getByRole("button", { name: "김팀원 팀원 삭제" });
  fireEvent.click(button); fireEvent.click(button);
  expect(removeMember).toHaveBeenCalledTimes(1);
  expect(button).toHaveTextContent("삭제 중");
  expect(screen.getByRole("button", { name: "승인" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "팀원·참여 신청 보기" })).toBeDisabled();
  await act(async () => { finish({ success: true }); });
  expect(screen.getByRole("button", { name: "승인" })).toBeEnabled();
});

test("admins can remove editors but cannot remove themselves or other admins", async () => {
  localStorage.setItem("id", "admin");
  loadWorkspaces.mockResolvedValue({ workspaces: [{ ...workspace, role: "admin" }] });
  await mountMembers();
  expect(screen.getByRole("button", { name: "김팀원 팀원 삭제" })).toBeEnabled();
  expect(screen.queryByRole("button", { name: "이관리자 팀원 삭제" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "박관리자 팀원 삭제" })).not.toBeInTheDocument();
});

test("an owner cannot delete their own row even when the stored role is inconsistent", async () => {
  localStorage.setItem("id", "editor");
  await mountMembers();
  expect(screen.queryByRole("button", { name: "김팀원 팀원 삭제" })).not.toBeInTheDocument();
});

test("a stale list response cannot bring a removed member back", async () => {
  await mountMembers();
  let finishList!: (value: { members: typeof members }) => void;
  loadMembers.mockImplementationOnce(() => new Promise(resolve => { finishList = resolve; }));
  fireEvent.click(screen.getByRole("button", { name: "팀원·참여 신청 보기" }));
  fireEvent.click(screen.getByRole("button", { name: "김팀원 팀원 삭제" }));
  await screen.findByText("김팀원님을 팀에서 삭제했습니다.");
  await act(async () => { finishList({ members }); });
  expect(screen.queryByText(/김팀원 \(editor\)/)).not.toBeInTheDocument();
});

test("pending approvals continue to use the existing approval endpoint", async () => {
  await mountMembers();
  fireEvent.click(screen.getByRole("button", { name: "승인" }));
  await waitFor(() => expect(decideMember).toHaveBeenCalledWith("team-1", "pending", true));
  expect(await screen.findByRole("status")).toHaveTextContent("팀원 참여를 승인했습니다.");
  expect(removeMember).not.toHaveBeenCalled();
});
