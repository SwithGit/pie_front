import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { GalleryPage, listPublicGalleries, PublicGallery } from "../../api/publicGalleries";
import "./exhibitions.css";

function Thumbnail({ gallery }: { gallery: PublicGallery }) {
  const [index, setIndex] = useState(0);
  return <div className="exhibition-image">
    {index < gallery.thumbnailUrls.length
      ? <img src={gallery.thumbnailUrls[index]} alt="" loading="lazy" decoding="async" onError={() => setIndex(i => i + 1)} />
      : <div className="exhibition-placeholder"><span>VRINART</span><strong>{gallery.title}</strong><span>새로운 공간을 만나보세요</span></div>}
    <span className="exhibition-open"><i /> 지금 관람 가능</span>
  </div>;
}

export default function Exhibitions() {
  const [params, setParams] = useSearchParams();
  const legacy = useParams();
  const page = Math.max(1, Number(params.get("page") || legacy.page) || 1);
  const order = params.get("order") || (legacy.order === "Like" ? "likes" : "latest");
  const search = params.get("q") || "";
  const [draft, setDraft] = useState(search);
  const [result, setResult] = useState<GalleryPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => setDraft(search), [search]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(""); setResult(null);
    listPublicGalleries(page, order, search, controller.signal)
      .then(data => { if (!controller.signal.aborted) setResult(data); })
      .catch(e => { if (!controller.signal.aborted) setError(e.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [page, order, search, revision]);
  function change(nextPage: number, nextOrder = order, nextSearch = search) {
    setParams({ page: String(nextPage), order: nextOrder, ...(nextSearch ? { q: nextSearch } : {}) });
  }
  return <div className="exhibitions-page">
    <header className="exhibitions-intro">
      <span className="exhibitions-eyebrow">VRINART · ONLINE EXHIBITIONS</span>
      <h1>지금, 열려 있는 전시</h1>
      <p>취향이 머무는 공간을 찾아보세요.<br />전시를 선택하면 브라우저에서 바로 관람할 수 있어요.</p>
    </header>
    <section aria-label="전시 둘러보기">
      <div className="exhibitions-toolbar">
        <p aria-live="polite">{loading ? "전시를 찾고 있어요" : result ? <><strong>{result.totalItems}</strong>개의 전시</> : "전시 목록"}</p>
        <form onSubmit={e => { e.preventDefault(); change(1, order, draft.trim()); }}>
          <label className="sr-only" htmlFor="exhibition-search">전시명 또는 제작자 검색</label>
          <input id="exhibition-search" placeholder="전시명 또는 제작자" value={draft} maxLength={80} onChange={e => setDraft(e.target.value)} />
          <button type="submit">검색</button>
        </form>
        <label className="sr-only" htmlFor="exhibition-order">정렬</label>
        <select id="exhibition-order" value={order} onChange={e => change(1, e.target.value)}>
          <option value="latest">최신순</option><option value="popular">많이 본 순</option><option value="likes">좋아요순</option>
        </select>
      </div>
      {error ? <div className="exhibition-message" role="alert"><h2>전시 목록을 불러오지 못했어요</h2><p>{error}</p><button onClick={() => setRevision(x => x + 1)}>다시 불러오기</button></div>
        : loading ? <div className="exhibition-grid" aria-label="전시 목록 로딩 중" aria-busy="true">{Array.from({ length: 6 }, (_, i) => <div className="exhibition-skeleton" key={i} />)}</div>
        : result?.galleries.length ? <div className="exhibition-grid">{result.galleries.map(gallery =>
          <a className="exhibition-card" key={gallery.code} href={`/ddookddak/${encodeURIComponent(gallery.code)}`} aria-label={`${gallery.title} 관람하기`}>
            <Thumbnail gallery={gallery} />
            <div className="exhibition-card-body"><p className="exhibition-creator">{gallery.creator}</p><h2>{gallery.title}</h2>
              <p className="exhibition-description">{gallery.description || "공간에 담긴 이야기를 직접 만나보세요."}</p>
              <div className="exhibition-card-bottom"><span>{gallery.alwaysOpen ? "상시 전시" : `${gallery.startDate} — ${gallery.endDate}`}</span><strong>관람하기 ↗</strong></div>
            </div>
          </a>)}</div>
        : <div className="exhibition-message"><h2>{search ? "검색 결과가 없어요" : "현재 열려 있는 전시가 없어요"}</h2><p>{search ? "다른 전시명이나 제작자로 검색해 보세요." : "새로운 전시가 열리면 이곳에서 만날 수 있어요."}</p>{search && <button onClick={() => change(1, order, "")}>전체 전시 보기</button>}</div>}
      {!!result?.totalPages && <nav className="exhibition-pagination" aria-label="전시 목록 페이지">
        <button disabled={page <= 1 || loading} onClick={() => change(page - 1)}>← 이전</button>
        <span>{page} / {result.totalPages}</span>
        <button disabled={page >= result.totalPages || loading} onClick={() => change(page + 1)}>다음 →</button>
      </nav>}
    </section>
  </div>;
}
