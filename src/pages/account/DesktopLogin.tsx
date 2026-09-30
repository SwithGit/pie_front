import React, { useState } from "react";
import { useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { RootState, useAppDispatch } from "../../app/store";
import { logout } from "../../redux/authSlice";
import { API_BASE_URL } from "../../api/api";
import "./DesktopLogin.css";

export default function DesktopLogin() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { token, id } = useSelector((state: RootState) => state.auth);
  const requestId = new URLSearchParams(location.search).get("request") || "";
  const valid = /^[a-f0-9]{64}$/.test(requestId);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const next = `/desktop-login?request=${requestId}`;
  const login = () => navigate(`/signin?next=${encodeURIComponent(next)}`);
  const approve = async () => {
    if (busy || done || !valid || !token) return;
    setBusy(true); setError("");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/desktop/approve`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ requestId }), signal: controller.signal,
      });
      if (response.status === 401) { dispatch(logout()); login(); return; }
      if (response.status === 410) throw new Error("로그인 요청이 만료되었거나 이미 사용되었습니다. PC 앱에서 다시 시작해 주세요.");
      if (!response.ok) throw new Error("PC 로그인에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
      const result = await response.json();
      if (result?.success !== true) throw new Error("계정 연결을 확인하지 못했습니다. 다시 시도해 주세요.");
      setDone(true);
    } catch (reason) { setError(controller.signal.aborted ? "연결 시간이 초과되었습니다. 다시 시도해 주세요." : reason instanceof Error ? reason.message : "연결에 실패했습니다."); }
    finally { clearTimeout(timeout); setBusy(false); }
  };
  return <section className="desktop-login"><div className="desktop-login-card">
    <span className="desktop-login-brand">VRINART · PC</span>
    <h1>{done ? "PC 앱으로 돌아가 주세요" : "PC 앱에 로그인"}</h1>
    {!valid ? <p role="alert">유효한 로그인 요청이 없습니다. PC 앱의 ‘Vrinart로 로그인’에서 시작해 주세요.</p>
      : done ? <p role="status">계정 연결을 완료했어요. PC 앱에서 로그인이 자동으로 이어집니다.</p>
      : <><p>PC 앱에 표시된 확인 코드와 같은지 확인해 주세요.</p>
        <strong className="desktop-login-code">{requestId.slice(0, 6).toUpperCase()}</strong>
        {token && id ? <><p><strong>{id}</strong> 계정으로 PC 앱에 로그인합니다.</p>
          <button disabled={busy} onClick={approve}>{busy ? "연결 중…" : "이 계정으로 PC 로그인"}</button>
          <button className="secondary" disabled={busy} onClick={() => { dispatch(logout()); login(); }}>다른 계정으로 로그인</button></>
          : <><p>Vrinart 계정 또는 구글·카카오 계정으로 로그인해 주세요.</p><button onClick={login}>로그인하고 연결하기</button></>}
        {error && <p className="desktop-login-error" role="alert">{error}</p>}
        <small>직접 시작한 PC 로그인 요청에만 연결해 주세요. 요청은 5분 뒤 만료됩니다.</small>
      </>}
  </div></section>;
}
