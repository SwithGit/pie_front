import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Curation, exhibitionCategories, getCurationAccess, getCuratedGallery, listPublicGalleries, PublicGallery, saveCuration } from "../../api/publicGalleries";
import "./exhibitions.css";

export default function ExhibitionAdmin() {
  const [params, setParams] = useSearchParams();
  const code = params.get("code") || "";
  const [access, setAccess] = useState(false), [checking, setChecking] = useState(true);
  const [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [gallery, setGallery] = useState<PublicGallery | null>(null);
  const [items, setItems] = useState<PublicGallery[]>([]);
  const [query, setQuery] = useState(""), [search, setSearch] = useState("");
  const [page, setPage] = useState(1), [totalPages, setTotalPages] = useState(0);
  const [codeInput, setCodeInput] = useState(code), [busy, setBusy] = useState(false);
  const [tags, setTags] = useState("");
  const [form, setForm] = useState<Curation>({ category: "", tags: [], featured: false, featureOrder: 0, editorialNote: "", shareImageUrl: "" });
  useEffect(() => {
    const controller = new AbortController();
    getCurationAccess(controller.signal).then(() => setAccess(true)).catch(e => { if (!controller.signal.aborted) setError(e.message); }).finally(() => { if (!controller.signal.aborted) setChecking(false); });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (!access) return;
    const controller = new AbortController(); setError(""); setItems([]);
    listPublicGalleries(page, "latest", search, controller.signal).then(data => { if (!controller.signal.aborted) { setItems(data.galleries); setTotalPages(data.totalPages); } }).catch(e => { if (!controller.signal.aborted) setError(e.message); });
    return () => controller.abort();
  }, [access, search, page]);
  useEffect(() => {
    if (!access || !code) { setGallery(null); return; }
    const controller = new AbortController(); setGallery(null); setError(""); setNotice(""); setCodeInput(code);
    getCuratedGallery(code, controller.signal).then(({ gallery: item }) => {
      if (controller.signal.aborted) return;
      setGallery(item); setTags((item.tags || []).join(", "));
      setForm({ category: item.category || "", tags: item.tags || [], featured: !!item.featured, featureOrder: item.featureOrder || 0, editorialNote: item.editorialNote || "", shareImageUrl: item.shareImageUrl || "" });
    }).catch(e => { if (!controller.signal.aborted) setError(e.message); });
    return () => controller.abort();
  }, [access, code]);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError(""); setNotice("");
    try { await saveCuration(code, { ...form, tags: tags.split(",").map(x => x.trim()).filter(Boolean) }); setNotice("저장했어요. 공개 중인 전시에만 홈 노출 설정이 적용됩니다."); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <div className="exhibitions-page exhibition-admin"><Link to="/workspaces" className="discovery-back">← 작업 공간</Link>
    <header className="exhibitions-intro"><span className="exhibitions-eyebrow">CURATION</span><h1>팝업·전시 노출 관리</h1><p>분류와 태그, 홈 추천 전시, 공유 대표 이미지를 관리해요.</p></header>
    {error && <p className="exhibition-message" role="alert">{error}</p>}{checking && <p>운영자 권한을 확인하고 있어요.</p>}
    {!checking && !access && <Link to="/signin?next=/admin/exhibitions">운영자 계정으로 로그인</Link>}
    {access && <div className="exhibition-admin-layout"><aside>
      <form className="discovery-search" onSubmit={e => { e.preventDefault(); setSearch(query); setPage(1); }}><input aria-label="공개 전시 검색" placeholder="전시명 또는 제작자 검색" value={query} maxLength={80} onChange={e => setQuery(e.target.value)} /><button>검색</button></form>
      <ul>{items.map(item => <li key={item.code}><button disabled={busy} className={item.code === code ? "selected" : ""} onClick={() => setParams({ code: item.code })}>{item.title}<small>{item.creator}</small></button></li>)}</ul>
      {!items.length && <p>검색된 공개 전시가 없어요.</p>}
      {totalPages > 1 && <div className="exhibition-pagination"><button disabled={page <= 1 || busy} onClick={() => setPage(page - 1)}>이전</button><span>{page} / {totalPages}</span><button disabled={page >= totalPages || busy} onClick={() => setPage(page + 1)}>다음</button></div>}
      <form className="exhibition-code-form" onSubmit={e => { e.preventDefault(); setParams({ code: codeInput.trim() }); }}><label htmlFor="admin-code">비공개·종료 전시는 전시 코드로 찾기</label><input id="admin-code" required maxLength={45} value={codeInput} onChange={e => setCodeInput(e.target.value)} /><button disabled={busy}>전시 불러오기</button></form>
    </aside><section>{!gallery ? <div className="exhibition-message">관리할 전시를 선택해 주세요.</div> : <form className="exhibition-curation-form" onSubmit={submit}>
      <h2>{gallery.title}</h2><p>{gallery.creator}</p>
      <label>분류<select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}><option value="">미분류</option>{exhibitionCategories.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      <label>태그 <small>쉼표로 구분 · 최대 5개 · 각각 20자</small><input value={tags} maxLength={108} onChange={e => setTags(e.target.value)} placeholder="사진, 일러스트, 라이프스타일" /></label>
      <label className="exhibition-checkbox"><input type="checkbox" checked={form.featured} onChange={e => setForm({ ...form, featured: e.target.checked })} />홈 메인 추천에 노출</label>
      <label>추천 노출 순서 <small>작은 숫자부터, 최대 6개 노출</small><input type="number" min={0} max={999} required value={form.featureOrder} onChange={e => setForm({ ...form, featureOrder: Number(e.target.value) })} /></label>
      <label>추천 소개 문구<textarea value={form.editorialNote} maxLength={160} rows={3} onChange={e => setForm({ ...form, editorialNote: e.target.value })} /></label>
      <label>홈·SNS 공유 대표 이미지 주소 <small>공개 HTTPS 이미지 · 1200×630 권장 · 비우면 기존 전시 썸네일 사용</small><input type="url" value={form.shareImageUrl} maxLength={1000} onChange={e => setForm({ ...form, shareImageUrl: e.target.value })} placeholder="https://..." /></label>
      <button className="discovery-primary" disabled={busy}>{busy ? "저장 중…" : "노출 설정 저장"}</button><Link to={`/exhibitions/${encodeURIComponent(code)}`}>공개 상세 페이지 확인 ↗</Link>
      {notice && <p role="status">{notice}</p>}
    </form>}</section></div>}
  </div>;
}
