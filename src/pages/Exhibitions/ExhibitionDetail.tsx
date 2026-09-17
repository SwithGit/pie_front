import { ExhibitionOffers } from "./BusinessPublic";
import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getPublicGallery, PublicGallery } from "../../api/publicGalleries";
import { ExhibitionActions, RelatedExhibitions } from "./CommunityDetail";
import { categoryLabel, period, Thumbnail } from "./ExhibitionCard";
import "./exhibitions.css";

export default function ExhibitionDetail() {
  const { code = "" } = useParams();
  const [gallery, setGallery] = useState<PublicGallery | null>(null);
  const [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [retry, setRetry] = useState(0);
  const [manualCopy, setManualCopy] = useState(false);
  const shareUrl = `${window.location.origin}/share/${encodeURIComponent(code)}`;
  useEffect(() => {
    const controller = new AbortController(); setGallery(null); setError(""); setNotice(""); setManualCopy(false);
    getPublicGallery(code, controller.signal).then(data => { if (!controller.signal.aborted) setGallery(data.gallery); })
      .catch(e => { if (!controller.signal.aborted) setError(e.message); });
    return () => controller.abort();
  }, [code, retry]);
  useEffect(() => {
    if (!gallery) return;
    const previous = document.title; document.title = `${gallery.title} | 뚝딱`;
    return () => { document.title = previous; };
  }, [gallery]);
  async function share() {
    try {
      if (navigator.share) await navigator.share({ title: gallery?.title, text: gallery?.editorialNote || gallery?.description, url: shareUrl });
      else { await navigator.clipboard.writeText(shareUrl); setNotice("전시 링크가 복사되었어요."); }
    } catch (e) { if ((e as Error).name !== "AbortError") { setManualCopy(true); setNotice("아래 링크를 복사해 공유해 주세요."); } }
  }
  return <div className="exhibitions-page exhibition-detail">
    <Link className="discovery-back" to="/galleries">← 팝업·전시 둘러보기</Link>
    {error ? <div className="exhibition-message" role="alert"><h1>전시를 확인할 수 없어요</h1><p>{error}</p><button onClick={() => setRetry(x => x + 1)}>다시 확인</button></div>
      : !gallery ? <div className="exhibition-skeleton discovery-hero" aria-label="전시 상세 불러오는 중" aria-busy="true" />
      : <><div className="exhibition-detail-top"><Thumbnail key={gallery.code} gallery={gallery} eager /><div className="exhibition-detail-summary">
        <span className="discovery-pill">{categoryLabel(gallery.category)}</span><h1>{gallery.title}</h1><Link className="exhibition-creator-link" to={`/creators/${encodeURIComponent(gallery.creator)}`}>{gallery.creator} →</Link>
        {gallery.editorialNote && <p className="exhibition-detail-note">{gallery.editorialNote}</p>}
        <dl><div><dt>관람 기간</dt><dd>{period(gallery)}</dd></div><div><dt>관람 방법</dt><dd>브라우저에서 온라인 관람</dd></div><div><dt>조회</dt><dd>{gallery.views.toLocaleString("ko-KR")}</dd></div></dl>
        <a className="discovery-primary" href={`/ddookddak/${encodeURIComponent(code)}`}>전시 입장하기 <span>↗</span></a><button className="exhibition-share" onClick={share}>전시 공유하기</button>
        <ExhibitionActions key={gallery.code} gallery={gallery} />
        <p className="exhibition-viewer-note">입장 시 공간을 불러오는 데 시간이 걸릴 수 있어요.<br />PC 브라우저에서 더 쾌적하게 관람할 수 있어요.</p>
        {notice && <p role="status">{notice}</p>}{manualCopy && <input aria-label="공유 링크" readOnly value={shareUrl} onFocus={e => e.target.select()} />}
      </div></div>
      <section className="exhibition-about"><h2>이 공간의 이야기</h2><p>{gallery.description || "자세한 이야기는 전시 공간 안에서 만나보세요."}</p>
        {!!gallery.tags?.length && <div className="exhibition-filter-chips">{gallery.tags.map(tag => <Link key={tag} to={`/galleries?tag=${encodeURIComponent(tag)}`}>#{tag}</Link>)}</div>}
      </section><ExhibitionOffers code={gallery.code} /><RelatedExhibitions code={gallery.code} /><div className="exhibition-detail-more"><h2>또 다른 취향을 만나보세요.</h2><Link to={gallery.category ? `/galleries?category=${gallery.category}` : "/galleries"}>다른 팝업·전시 둘러보기 →</Link></div></>}
  </div>;
}
