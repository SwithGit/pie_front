import React, { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { exhibitionCategories, GalleryPage, listPublicGalleries } from "../../api/publicGalleries";
import ExhibitionCard from "./ExhibitionCard";
import "./exhibitions.css";

export default function Exhibitions() {
  const [params, setParams] = useSearchParams();
  const legacy = useParams();
  const page = Math.max(1, Number(params.get("page") || legacy.page) || 1);
  const order = params.get("order") || (legacy.order === "Like" ? "likes" : "latest");
  const search = params.get("q") || "", category = params.get("category") || "", tag = params.get("tag") || "";
  const [draft, setDraft] = useState(search);
  const [result, setResult] = useState<GalleryPage | null>(null);
  const [loading, setLoading] = useState(true), [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => setDraft(search), [search]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(""); setResult(null);
    listPublicGalleries(page, order, search, controller.signal, category, tag)
      .then(data => { if (!controller.signal.aborted) setResult(data); })
      .catch(e => { if (!controller.signal.aborted) setError(e.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [page, order, search, category, tag, revision]);
  function change(values: Record<string, string>) {
    const next = new URLSearchParams(params);
    next.set("page", "1");
    Object.entries(values).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key));
    setParams(next);
  }
  return <div className="exhibitions-page">
    <header className="exhibitions-intro"><Link to="/" className="exhibitions-eyebrow">DDUKDDAK · DISCOVER</Link>
      <h1>취향 따라, 공간 여행<span className="amber-dot">.</span></h1><p>새로운 브랜드와 작가의 이야기를 만나보세요.<br />마음에 드는 공간을 골라 지금 관람할 수 있어요.</p></header>
    <nav className="exhibition-filter-chips" aria-label="전시 분류"><button aria-pressed={!category} onClick={() => change({ category: "" })}>전체</button>{exhibitionCategories.map(item => <button key={item.id} aria-pressed={category === item.id} onClick={() => change({ category: item.id })}>{item.label}</button>)}</nav>
    <section aria-label="팝업·전시 목록">
      <div className="exhibitions-toolbar"><p aria-live="polite">{loading ? "전시를 찾고 있어요" : result ? <><strong>{result.totalItems}</strong>개의 공간</> : "전시 목록"}</p>
        <form onSubmit={e => { e.preventDefault(); change({ q: draft.trim() }); }}><label className="sr-only" htmlFor="exhibition-search">전시명 또는 제작자 검색</label><input id="exhibition-search" placeholder="전시명 또는 제작자" value={draft} maxLength={80} onChange={e => setDraft(e.target.value)} /><button type="submit">검색</button></form>
        <label className="sr-only" htmlFor="exhibition-order">정렬</label><select id="exhibition-order" value={order} onChange={e => change({ order: e.target.value })}><option value="latest">최신순</option><option value="popular">인기순</option><option value="ending">종료 임박</option><option value="featured">운영자 추천</option><option value="likes">웹 좋아요순</option></select>
      </div>
      {tag && <p className="exhibition-active-tag">#{tag} <button onClick={() => change({ tag: "" })} aria-label={`${tag} 태그 해제`}>×</button></p>}
      {error ? <div className="exhibition-message" role="alert"><h2>전시 목록을 불러오지 못했어요</h2><p>{error}</p><button onClick={() => setRevision(x => x + 1)}>다시 불러오기</button></div>
        : loading ? <div className="exhibition-grid" aria-label="전시 목록 로딩 중" aria-busy="true">{Array.from({ length: 4 }, (_, i) => <div className="exhibition-skeleton" key={i} />)}</div>
        : result?.galleries.length ? <div className="exhibition-grid">{result.galleries.map(gallery => <ExhibitionCard key={gallery.code} gallery={gallery} />)}</div>
        : <div className="exhibition-message"><h2>조건에 맞는 공간이 아직 없어요</h2><p>다른 관심사를 선택하거나 전체 전시를 둘러보세요.</p><button onClick={() => setParams({})}>전체 전시 보기</button></div>}
      {!!result?.totalPages && <nav className="exhibition-pagination" aria-label="전시 목록 페이지"><button disabled={page <= 1 || loading} onClick={() => change({ page: String(page - 1) })}>← 이전</button><span>{page} / {result.totalPages}</span><button disabled={page >= result.totalPages || loading} onClick={() => change({ page: String(page + 1) })}>다음 →</button></nav>}
    </section>
  </div>;
}
