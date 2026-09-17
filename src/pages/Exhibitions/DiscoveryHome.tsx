import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DiscoveryData, exhibitionCategories, getDiscoveryHome, PublicGallery } from "../../api/publicGalleries";
import ExhibitionCard, { period, Thumbnail } from "./ExhibitionCard";
import "./exhibitions.css";

function Shelf({ title, subtitle, galleries, order }: { title: string; subtitle: string; galleries: PublicGallery[]; order: string }) {
  if (!galleries.length) return null;
  return <section className="discovery-section"><header className="discovery-section-head"><div><h2>{title}</h2><p>{subtitle}</p></div>
    <Link to={`/galleries?order=${order}`}>전체 보기 <span aria-hidden="true">↗</span></Link></header>
    <div className={`exhibition-grid ${galleries.length === 2 ? "exhibition-grid-pair" : ""}`}>{galleries.map(gallery => <ExhibitionCard key={gallery.code} gallery={gallery} />)}</div></section>;
}
export default function DiscoveryHome() {
  const [data, setData] = useState<DiscoveryData | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [slide, setSlide] = useState(0);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  useEffect(() => {
    const controller = new AbortController();
    setError(""); setData(null);
    getDiscoveryHome(controller.signal).then(result => { if (!controller.signal.aborted) { setData(result); setSlide(0); } })
      .catch(e => { if (!controller.signal.aborted) setError(e.message); });
    return () => controller.abort();
  }, [retry]);
  const heroes = data?.featured.length ? data.featured : data?.latest.slice(0, 1) || [];
  const hero = heroes[slide];
  return <div className="exhibitions-page discovery-home">
    <header className="discovery-welcome"><div><span className="exhibitions-eyebrow">DDUKDDAK · ONLINE POP-UP</span>
      <h1>새로운 취향이 열리는 곳<span className="amber-dot">.</span></h1><p>브랜드의 이야기부터 나만 알고 싶은 전시까지, 지금 만나보세요.</p></div>
      <form className="discovery-search" onSubmit={e => { e.preventDefault(); navigate(`/galleries?q=${encodeURIComponent(search.trim())}`); }}>
        <label className="sr-only" htmlFor="home-search">팝업 또는 제작자 검색</label><input id="home-search" value={search} maxLength={80} placeholder="어떤 공간이 궁금하세요?" onChange={e => setSearch(e.target.value)} /><button aria-label="검색">검색 ↗</button></form>
    </header>
    {error ? <div className="exhibition-message" role="alert"><h2>전시 소식을 가져오지 못했어요</h2><p>{error}</p><button onClick={() => setRetry(x => x + 1)}>다시 불러오기</button></div>
      : !data ? <div className="discovery-hero exhibition-skeleton" aria-label="추천 전시 불러오는 중" aria-busy="true" />
      : hero ? <section className="discovery-hero" aria-label="주목할 팝업·전시"><div className="discovery-hero-copy">
        <span className="discovery-pill">{data.featured.length ? "뚝딱이 주목한 공간" : "새로 열린 공간"}</span>
        <h2>{hero.title}</h2><p>{hero.editorialNote || hero.description || "스크린 너머, 새로운 공간의 이야기를 만나보세요."}</p>
        <span className="discovery-hero-by">{hero.creator} · {period(hero)}</span>
        <Link className="discovery-primary" to={`/exhibitions/${encodeURIComponent(hero.code)}`}>팝업·전시 둘러보기 <span>↗</span></Link>
        {heroes.length > 1 && <div className="discovery-slide-controls"><button aria-label="이전 추천 전시" onClick={() => setSlide((slide + heroes.length - 1) % heroes.length)}>←</button><span aria-live="polite">{slide + 1} / {heroes.length}</span><button aria-label="다음 추천 전시" onClick={() => setSlide((slide + 1) % heroes.length)}>→</button></div>}
      </div><Link className="discovery-hero-image" to={`/exhibitions/${encodeURIComponent(hero.code)}`} aria-label={`${hero.title} 자세히 보기`}><Thumbnail key={hero.code} gallery={hero} eager /></Link></section>
      : <section className="discovery-empty-hero"><span className="discovery-pill">작은 아이디어가 새로운 공간으로</span><h2>다음 팝업의 주인공은<br />당신이 될 수 있어요.</h2><p>지금은 공개된 전시가 없어요. 첫 번째 공간을 열어보세요.</p><Link className="discovery-primary" to="/product">뚝딱 알아보기 ↗</Link></section>}
    <nav className="discovery-categories" aria-label="관심사별 전시"><Link to="/galleries">전체 보기 <span>↗</span></Link>{exhibitionCategories.map((item, i) => <Link key={item.id} to={`/galleries?category=${item.id}`}><span className="category-number">0{i + 1}</span>{item.label}</Link>)}</nav>
    {data && <>
      <Shelf title={data.totalItems >= 4 ? "지금 많이 찾는 공간" : "지금, 열려 있는 팝업·전시"} subtitle={data.totalItems >= 4 ? "누적 조회수가 높은 공간을 만나보세요." : "마음에 드는 공간에 들어가 이야기를 만나보세요."} galleries={data.popular} order="popular" />
      {data.totalItems > 4 && <Shelf title="새로 문을 열었어요" subtitle="가장 먼저 발견하는 즐거움, 새로운 팝업과 전시." galleries={data.latest} order="latest" />}
      {data.totalItems > 4 && <Shelf title="놓치기 전에 만나보세요" subtitle="앞으로 2주 안에 종료되는 기간 한정 공간이에요." galleries={data.ending} order="ending" />}
      {data.totalItems > 0 && data.totalItems <= 4 && <div className="discovery-quick-links"><Link to="/galleries?order=latest">새로 열린 전시 ↗</Link><Link to="/galleries?order=ending">곧 종료되는 전시 ↗</Link></div>}
    </>}
    <section className="discovery-create"><div><span className="exhibitions-eyebrow">FOR CREATORS</span><h2>당신의 이야기도<br />하나의 공간이 되도록.</h2><p>공간을 꾸미고, 팀과 함께 만들고, 링크 하나로 세상에 공개하세요.</p></div><div className="discovery-create-actions"><Link className="discovery-primary" to="/download">뚝딱으로 제작하기 ↗</Link><Link to="/product">제작 도구 알아보기 →</Link></div></section>
  </div>;
}
