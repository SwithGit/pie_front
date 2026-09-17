import { safeLoginNext } from "../../utils/safeLoginNext";
import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import styled from "styled-components";
import { loginSuccess } from "../../redux/authSlice";
import { completeSocialProfile, getSocialProfile, ProfileError, ProfileFields, ProfileStatus } from "../../api/socialProfile";

const Shell = styled.section`
  max-width: 480px; margin: 100px auto 80px; padding: 0 24px;
  color: #242424; font-family: "Pretendard", sans-serif;
  h1 { font-size: 30px; letter-spacing: -1px; margin: 20px 0 12px; }
  p { color: #717171; font-size: 14px; line-height: 1.7; }
  @media(max-width: 768px) { margin-top: 60px; h1 { font-size: 26px; } }
`;
const Badge = styled.span`
  display: inline-block; padding: 7px 12px; border-radius: 20px;
  background: #fff4d6; color: #755300; font-size: 13px; font-weight: 600;
`;
const Form = styled.form`
  margin-top: 32px; display: flex; flex-direction: column; gap: 22px;
  label { display: block; font-size: 14px; font-weight: 600; }
  label span { color: #8c8c8c; font-weight: 400; font-size: 12px; margin-left: 6px; }
  input { box-sizing: border-box; width: 100%; margin-top: 9px; padding: 14px 15px;
    border: 1px solid #d9d9d9; border-radius: 8px; font: inherit; font-size: 15px; }
  input:focus { outline: 2px solid #fab92c; outline-offset: 1px; }
  input:read-only { background: #f6f6f6; color: #777; }
  small { display: block; margin-top: 7px; color: #888; font-size: 12px; }
  button { min-height: 48px; border: 0; border-radius: 8px; background: #fab92c;
    color: #171717; font: inherit; font-weight: 700; cursor: pointer; }
  button:disabled { opacity: .5; cursor: not-allowed; }
  a { text-align: center; color: #777; font-size: 13px; }
`;
const ErrorText = styled.p`&& { color: #b42318; margin: 0; }`;
const previewProfile: ProfileStatus = { provider: "kakao", profile: { name: "", nickname: "", email: "" }, missingFields: ["name", "nickname"], requiresProfile: true };

export default function CompleteProfile() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const params = new URLSearchParams(location.search);
  const preview = process.env.NODE_ENV === "development" && params.get("preview") === "1";
  const next = safeLoginNext(params.get("next"));
  const token = sessionStorage.getItem("socialProfileToken");
  const [status, setStatus] = useState<ProfileStatus | null>(null);
  const [fields, setFields] = useState<ProfileFields>({ name: "", nickname: "", email: "" });
  const [error, setError] = useState("");
  const [expired, setExpired] = useState(false);
  const [saving, setSaving] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (preview) { setStatus(previewProfile); setFields(previewProfile.profile); return; }
    if (!token) { navigate(`/signin?next=${encodeURIComponent(next)}`, { replace: true }); return; }
    const controller = new AbortController();
    setError("");
    getSocialProfile(token, controller.signal).then(data => {
      setStatus(data); setFields(data.profile);
    }).catch(err => {
      if (controller.signal.aborted) return;
      setError(err.message || "회원 정보를 불러오지 못했습니다.");
      if (err instanceof ProfileError && [401, 403].includes(err.status)) { setExpired(true); sessionStorage.removeItem("socialProfileToken"); }
    });
    return () => controller.abort();
  }, [token, preview, navigate, next, retry]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving || !status || expired) return;
    if (preview) { setError("미리보기 화면입니다. 실제 소셜 로그인 후 저장할 수 있어요."); return; }
    if (!token) return;
    setSaving(true); setError("");
    try {
      const result = await completeSocialProfile(token, fields);
      dispatch(loginSuccess(result));
      sessionStorage.removeItem("socialProfileToken");
      navigate(next, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장하지 못했습니다.");
      if (err instanceof ProfileError && [401, 403].includes(err.status)) setExpired(true);
    } finally { setSaving(false); }
  };
  const labels = { name: "이름", nickname: "닉네임", email: "이메일" };
  const ready = status && status.missingFields.every(field => fields[field].trim());
  return <Shell>
    <Badge>{preview ? "화면 미리보기" : "소셜 계정 인증 완료"}</Badge>
    <h1>조금만 더 알려주세요</h1>
    <p>뚝딱에서 사용할 정보를 완성해 주세요.<br />소셜 계정에서 받은 정보는 미리 채워 두었어요.</p>
    {!status && !error && <p role="status">회원 정보를 불러오는 중입니다…</p>}
    {status && <Form onSubmit={submit}>
      {(["name", "nickname", "email"] as const).map(field => {
        const locked = !!status.profile[field];
        return <div key={field}>
          <label htmlFor={`profile-${field}`}>{labels[field]}<span>{field === "email" ? "선택" : "필수"}</span></label>
          <input id={`profile-${field}`} name={field} type={field === "email" ? "email" : "text"}
            autoComplete={field === "name" ? "name" : field === "email" ? "email" : "nickname"}
            maxLength={field === "email" ? 50 : 30} required={field !== "email"} readOnly={locked}
            disabled={saving || expired} value={fields[field]}
            placeholder={field === "nickname" ? "서비스에서 사용할 닉네임" : field === "email" ? "example@email.com" : "이름을 입력해 주세요"}
            onChange={e => setFields({ ...fields, [field]: e.target.value })} />
          {locked && <small>이미 등록된 정보예요.</small>}
          {field === "email" && !locked && <small>이메일은 나중에 마이페이지에서도 추가할 수 있어요.</small>}
        </div>;
      })}
      {error && <ErrorText role="alert">{error}</ErrorText>}
      <button type="submit" disabled={!ready || saving || expired}>{saving ? "저장하는 중…" : "저장하고 시작하기"}</button>
      <Link to={`/signin?next=${encodeURIComponent(next)}`} onClick={() => sessionStorage.removeItem("socialProfileToken")}>{expired ? "다시 로그인하기" : "로그인 화면으로 돌아가기"}</Link>
    </Form>}
    {!status && error && <Form as="div"><ErrorText role="alert">{error}</ErrorText>
      {!expired && <button onClick={() => setRetry(retry + 1)}>다시 불러오기</button>}
      <Link to={`/signin?next=${encodeURIComponent(next)}`}>다시 로그인하기</Link>
    </Form>}
  </Shell>;
}
