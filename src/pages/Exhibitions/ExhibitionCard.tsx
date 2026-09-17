import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { exhibitionCategories, PublicGallery } from "../../api/publicGalleries";

export function Thumbnail({ gallery, eager = false }: { gallery: PublicGallery; eager?: boolean }) {
  const [index, setIndex] = useState(0);
  useEffect(() => setIndex(0), [gallery.code, gallery.shareImageUrl]);
  const urls = [...(gallery.shareImageUrl ? [gallery.shareImageUrl] : []), ...gallery.thumbnailUrls];
  return <div className="exhibition-image">
    {index < urls.length ? <img src={urls[index]} alt={`${gallery.title} 전시 공간`} loading={eager ? "eager" : "lazy"} decoding="async" onError={() => setIndex(i => i + 1)} />
      : <div className="exhibition-placeholder"><span>DDUKDDAK · ONLINE POP-UP</span><strong>{gallery.title}</strong><span>새로운 공간, 새로운 발견</span></div>}
  </div>;
}
export const categoryLabel = (id?: string) => exhibitionCategories.find(x => x.id === id)?.label || "온라인 전시";
export function period(gallery: PublicGallery) {
  return gallery.alwaysOpen ? "상시 관람" : `${gallery.startDate || ""} — ${gallery.endDate || ""}`;
}
export function endLabel(gallery: PublicGallery) {
  if (gallery.alwaysOpen || !gallery.endDate) return "상시 관람";
  const today = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
  const days = Math.round((Date.parse(gallery.endDate) - Date.parse(today)) / 86400000);
  return days === 0 ? "오늘 종료" : days > 0 && days <= 14 ? `D-${days}` : "지금 관람 가능";
}
export default function ExhibitionCard({ gallery }: { gallery: PublicGallery }) {
  return <article className="exhibition-card">
    <Link className="exhibition-card-link" to={`/exhibitions/${encodeURIComponent(gallery.code)}`}>
      <div className="exhibition-cover"><Thumbnail gallery={gallery} /><span className="exhibition-open">{endLabel(gallery)}</span></div>
      <div className="exhibition-card-body"><span className="exhibition-type">{categoryLabel(gallery.category)}</span>
        <h3>{gallery.title}</h3><p className="exhibition-creator">{gallery.creator}</p>
        <p className="exhibition-description">{gallery.editorialNote || gallery.description || "공간에 담긴 이야기를 직접 만나보세요."}</p>
      </div>
    </Link>
    {!!gallery.tags?.length && <div className="exhibition-tags">{gallery.tags.map(tag => <Link key={tag} to={`/galleries?tag=${encodeURIComponent(tag)}`}>#{tag}</Link>)}</div>}
    <div className="exhibition-card-bottom"><span>{period(gallery)}</span><span>조회 {gallery.views.toLocaleString("ko-KR")} · ♡ {gallery.webLikes || 0}</span></div>
  </article>;
}
