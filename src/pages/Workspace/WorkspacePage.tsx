import { exhibitionReviewEnabled } from "../../config/exhibitionReview";
import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  activateWorkspace, approveCompanyWorkspace, createTeamWorkspace, decideWorkspaceMember,
  getCompanyReviewQueue, getWorkspaceMembers, getWorkspaces, registerCompanyWorkspace,
  requestWorkspaceJoin,
} from "../../api/api";
import "./WorkspacePage.css";

type Workspace = {
  id: string; kind: "personal" | "team" | "company"; name: string;
  businessNumber?: string; status: string; role: string; memberStatus: string; activeWorkspaceId?: string;
};
type Member = { userId: string; name: string; nickname: string; role: string; status: string };
type CompanyReview = { id: string; name: string; businessNumber: string; createdBy: string; applicantName: string;
  applicantEmail?: string; applicantPhone?: string };

const messageOf = (error: any) => error?.response?.data?.err || "요청을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.";

const WorkspacePage: React.FC = () => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [members, setMembers] = useState<Record<string, Member[]>>({});
  const [reviews, setReviews] = useState<CompanyReview[]>([]);
  const [teamName, setTeamName] = useState("");
  const [company, setCompany] = useState({ companyName: "", businessNumber: "", openingDate: "", representativeName: "" });
  const [joinTarget, setJoinTarget] = useState("");
  const [notice, setNotice] = useState("");
  const [companyNotice, setCompanyNotice] = useState("");
  const [companySubmitting, setCompanySubmitting] = useState(false);
  const [busy, setBusy] = useState(false);
  const isLoggedIn = !!localStorage.getItem("token");

  const refresh = useCallback(async () => {
    const result = await getWorkspaces();
    setWorkspaces(result.workspaces || []);
    setIsPlatformAdmin(!!result.isPlatformAdmin);
    if (result.isPlatformAdmin) setReviews((await getCompanyReviewQueue()).companies || []);
  }, []);

  useEffect(() => {
    if (isLoggedIn) refresh().catch(error => setNotice(messageOf(error)));
  }, [isLoggedIn, refresh]);

  const run = async (action: () => Promise<any>, success: string, onStatus?: (message: string) => void, pending = "") => {
    setBusy(true); setNotice(""); onStatus?.(pending);
    try { await action(); await refresh(); setNotice(success); onStatus?.(success); return true; }
    catch (error) { const message = messageOf(error); setNotice(message); onStatus?.(message); return false; }
    finally { setBusy(false); }
  };

  const showMembers = async (workspaceId: string) => {
    try {
      const result = await getWorkspaceMembers(workspaceId);
      setMembers(current => ({ ...current, [workspaceId]: result.members || [] }));
    } catch (error) { setNotice(messageOf(error)); }
  };

  const decide = (workspaceId: string, userId: string, approve: boolean) => run(async () => {
    await decideWorkspaceMember(workspaceId, userId, approve);
    await showMembers(workspaceId);
  }, approve ? "팀원 참여를 승인했습니다." : "참여 신청을 거절했습니다.");

  if (!isLoggedIn) return <div className="workspace-page"><section className="workspace-card">
    <h1>작업 공간</h1><p>로그인한 뒤 개인·팀·회사 작업 공간을 관리할 수 있습니다.</p>
    <Link to="/signin?next=/workspaces">로그인하기</Link>
  </section></div>;

  return <div className="workspace-page">
    <header className="workspace-heading"><span>뚝딱 계정</span><h1>작업 공간</h1>
      <p>혼자 시작하거나 팀을 만들 수 있어요. 회사 등록과 소속 신청도 여기에서 진행합니다.</p></header>
    {isPlatformAdmin && <p><Link to="/admin/exhibitions">팝업·전시 홈 노출 관리 →</Link></p>}
    <p>{exhibitionReviewEnabled && <><Link to="/mypage/publications">내 전시 공개 심사 →</Link> · </>}<Link to="/mypage/creator">제작자·브랜드 프로필 →</Link></p>
    {notice && <div className="workspace-notice" role="status">{notice}</div>}

    <section className="workspace-card">
      <h2>내 작업 공간</h2>
      <div className="workspace-grid">
        {workspaces.map(workspace => <div className="workspace-item" key={workspace.id}>
          <div><strong>{workspace.name}</strong><small>{workspace.kind === "personal" ? "개인" : workspace.kind === "team" ? "팀" : "회사"}
            {workspace.status === "pending_review" ? " · 회사 승인 대기" : workspace.memberStatus === "pending" ? " · 참여 승인 대기" : ""}</small></div>
          {workspace.memberStatus === "active" && workspace.status === "active" && <button disabled={busy || workspace.activeWorkspaceId === workspace.id}
            onClick={() => run(() => activateWorkspace(workspace.id), "사용할 작업 공간을 변경했습니다.")}>
            {workspace.activeWorkspaceId === workspace.id ? "사용 중" : "이 공간에서 작업"}</button>}
          {workspace.kind !== "personal" && <div className="workspace-code">팀 코드: <code>{workspace.id}</code>
            <button type="button" onClick={async () => {
              try { await navigator.clipboard.writeText(workspace.id); window.alert("복사되었습니다"); }
              catch { window.alert("복사에 실패했습니다."); }
            }}>복사</button></div>}
          {workspace.memberStatus === "active" && ["owner", "admin"].includes(workspace.role) && workspace.status === "active" &&
            <button className="workspace-subtle" onClick={() => showMembers(workspace.id)}>팀원·참여 신청 보기</button>}
          {(members[workspace.id] || []).map(member => <div className="workspace-member" key={member.userId}>
            <span>{member.name || member.nickname} ({member.userId}) · {member.status === "pending" ? "승인 대기" : member.role}</span>
            {member.status === "pending" && <span><button disabled={busy} onClick={() => decide(workspace.id, member.userId, true)}>승인</button>
              <button disabled={busy} onClick={() => decide(workspace.id, member.userId, false)}>거절</button></span>}
          </div>)}
        </div>)}
      </div>
    </section>

    <div className="workspace-columns">
      <section className="workspace-card"><h2>새 팀 만들기</h2>
        <p>예비창업팀과 학교팀은 사업자번호 없이 함께 작업할 수 있어요.</p>
        <form onSubmit={event => { event.preventDefault(); run(() => createTeamWorkspace(teamName), "팀을 만들었습니다.").then(ok => { if (ok) setTeamName(""); }); }}>
          <label>팀 이름<input value={teamName} maxLength={120} required onChange={event => setTeamName(event.target.value)} /></label>
          <button disabled={busy}>팀 만들기</button></form></section>

      <section className="workspace-card"><h2>기존 팀·회사 참여</h2>
        <p>팀 코드를 받았거나 등록된 회사의 사업자번호를 알고 있다면 참여를 신청하세요. 관리자가 승인하면 작업 공간이 열립니다.</p>
        <form onSubmit={event => { event.preventDefault(); const target = joinTarget.trim();
          run(() => requestWorkspaceJoin(target.includes("-") && target.length === 36 ? { workspaceId: target } : { businessNumber: target }),
            "참여 신청을 보냈습니다.").then(ok => { if (ok) setJoinTarget(""); }); }}>
          <label>팀 코드 또는 사업자등록번호<input value={joinTarget} required onChange={event => setJoinTarget(event.target.value)} /></label>
          <button disabled={busy}>참여 신청</button></form></section>
    </div>

    <section className="workspace-card"><h2>회사 등록</h2>
      <p>첫 관리자만 등록합니다. 국세청에서 사업자번호·개업일자·대표자명을 확인하고, 운영자가 회사명과 신청 자격을 검토합니다.</p>
      <form className="workspace-company-form" onSubmit={event => { event.preventDefault();
        setCompanySubmitting(true);
        run(() => registerCompanyWorkspace(company), "회사 등록을 신청했습니다. 관리자 승인 후 사용할 수 있습니다.",
          setCompanyNotice, "국세청 정보를 확인 중입니다. 잠시만 기다려 주세요.")
          .finally(() => setCompanySubmitting(false)); }}>
        <label>회사명 (작업 공간 표시용)<input value={company.companyName} required maxLength={120} onChange={event => setCompany({ ...company, companyName: event.target.value })} /></label>
        <label>사업자등록번호<input value={company.businessNumber} required inputMode="numeric" placeholder="하이픈 없이 10자리"
          onChange={event => setCompany({ ...company, businessNumber: event.target.value })} /></label>
        <label>개업일자<input value={company.openingDate} required placeholder="YYYYMMDD" inputMode="numeric"
          onChange={event => setCompany({ ...company, openingDate: event.target.value })} /></label>
        <label>대표자명<input value={company.representativeName} required maxLength={100}
          onChange={event => setCompany({ ...company, representativeName: event.target.value })} /></label>
        <button disabled={busy}>{companySubmitting ? "국세청 확인 중..." : "국세청 확인 후 등록 신청"}</button>
        {companyNotice && <div className="workspace-notice workspace-company-feedback" role="status">{companyNotice}</div>}
      </form>
    </section>

    {isPlatformAdmin && <section className="workspace-card"><h2>회사 등록 검토</h2>
      {reviews.length === 0 ? <p>검토 대기 중인 회사가 없습니다.</p> : reviews.map(review => <div className="workspace-member" key={review.id}>
        <span>{review.name} · {review.businessNumber} · 신청자 {review.applicantName} ({review.createdBy})
          {review.applicantEmail ? ` · ${review.applicantEmail}` : ""}{review.applicantPhone ? ` · ${review.applicantPhone}` : ""}</span>
        <button disabled={busy} onClick={() => run(() => approveCompanyWorkspace(review.id), "회사 등록을 승인했습니다.")}>확인 후 승인</button>
      </div>)}
      <p>국세청은 사업자번호·개업일자·대표자명과 영업 상태를 확인합니다. 회사명과 신청자의 관리 권한은 별도로 확인한 뒤 승인하세요.</p>
    </section>}
  </div>;
};

export default WorkspacePage;
