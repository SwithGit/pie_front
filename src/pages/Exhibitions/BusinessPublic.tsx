import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import * as api from "../../api/exhibitionBusiness";
import { Thumbnail } from "./ExhibitionCard";
import "./exhibitions.css";
import "./business.css";

export const offerKind=(kind:string)=>({product:'상품 보기',reservation:'예약하기',coupon:'쿠폰 코드 확인'}[kind]||kind);
export const priceText=(plan:api.Plan)=>plan.priceKrw===null?'별도 협의':`${plan.priceKrw.toLocaleString('ko-KR')}원${plan.billingUnit==='month'?' / 월':plan.billingUnit==='exhibition'?' / 전시':''}`;
function OfferCard({offer}:{offer:api.Offer}) {
  const [busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[coupon,setCoupon]=useState(''),[url,setUrl]=useState('');
  async function activate(){setBusy(true);setNotice('');try{const result=await api.activateOffer(offer.id);if(result.couponCode){setCoupon(result.couponCode);setUrl(result.url);}else window.location.assign(result.url);}catch(e){setNotice((e as Error).message);}finally{setBusy(false);}}
  async function copy(){try{await navigator.clipboard.writeText(coupon);setNotice('쿠폰 코드가 복사되었어요.');}catch{setNotice('자동 복사를 사용할 수 없어요. 아래 코드를 선택해 복사해 주세요.');}}
  return <article className="business-offer"><span className="discovery-pill">{offer.kind==='coupon'?'관람객 혜택':offer.kind==='reservation'?'예약 안내':'브랜드 상품'}</span><h3>{offer.title}</h3><p>{offer.description}</p>{(offer.startsOn||offer.endsOn)&&<small>{offer.startsOn||'상시'} — {offer.endsOn||'종료일 미정'}</small>}<p className="business-domain">{new URL(offer.url).hostname}</p>
    {coupon?<div className="business-coupon"><label>쿠폰 코드<input readOnly value={coupon} onFocus={e=>e.target.select()}/></label><button onClick={copy}>코드 복사</button><a href={url} rel="noopener noreferrer">쿠폰 사용처로 이동 ↗</a></div>:<button className="discovery-primary" disabled={busy} onClick={activate}>{busy?'확인 중…':offerKind(offer.kind)} {offer.kind!=='coupon'&&'↗'}</button>}
    {notice&&<p role="status">{notice}</p>}
  </article>;
}
export function ExhibitionOffers({code}:{code:string}) {
  const [offers,setOffers]=useState<api.Offer[]>([]),[error,setError]=useState(''),[retry,setRetry]=useState(0);
  useEffect(()=>{const controller=new AbortController();setOffers([]);setError('');api.getOffers(code,false,controller.signal).then(data=>{if(!controller.signal.aborted)setOffers(data.offers);}).catch(e=>{if(!controller.signal.aborted)setError(e.message);});return()=>controller.abort();},[code,retry]);
  if(error)return <section className="business-inline-error"><p>전시의 상품·혜택 정보를 불러오지 못했어요.</p><button onClick={()=>setRetry(x=>x+1)}>다시 확인</button></section>;
  if(!offers.length)return null;
  return <section className="discovery-section"><header className="discovery-section-head"><div><h2>공간에서 발견한 취향, 일상으로</h2><p>브랜드가 준비한 상품과 예약, 관람객 혜택을 만나보세요.</p></div></header><div className="business-offers">{offers.map(offer=><OfferCard key={offer.id} offer={offer}/>)}</div><p className="business-muted">구매·예약 및 쿠폰 사용은 연결된 외부 서비스에서 진행돼요. 적용 조건과 최종 금액은 해당 사용처에서 확인해 주세요.</p></section>;
}
export function PromotionShelf() {
  const [items,setItems]=useState<api.Promotion[]>([]);
  useEffect(()=>{const controller=new AbortController();api.getPromotions(false,controller.signal).then(data=>{if(!controller.signal.aborted)setItems(data.promotions);}).catch(()=>{});return()=>controller.abort();},[]);
  if(!items.length)return null;
  return <section className="discovery-section"><header className="discovery-section-head"><div><h2>브랜드와 함께 여는 공간</h2><p>새로운 경험을 제안하는 프로모션 전시를 만나보세요.</p></div><span className="business-ad">광고 · Sponsored</span></header><div className="business-promotions">{items.map(item=><Link className="business-promotion" key={item.id} to={`/exhibitions/${encodeURIComponent(item.code)}`} onClick={()=>{void api.trackPromotion(item.id).catch(()=>undefined);}}>{item.gallery&&<Thumbnail gallery={item.gallery}/>}<div><span className="business-ad">광고 · {item.sponsor}</span><h3>{item.title}</h3><p>{item.description}</p><small>{item.startsOn} — {item.endsOn}</small><strong>전시 만나보기 ↗</strong></div></Link>)}</div></section>;
}
export function BusinessPricing() {
  const [plans,setPlans]=useState<api.Plan[]|null>(null),[error,setError]=useState(''),[retry,setRetry]=useState(0);
  useEffect(()=>{const controller=new AbortController();setError('');setPlans(null);api.getPlans(false,controller.signal).then(data=>{if(!controller.signal.aborted)setPlans(data.plans);}).catch(e=>{if(!controller.signal.aborted)setError(e.message);});return()=>controller.abort();},[retry]);
  return <div className="exhibitions-page business-page"><header className="exhibitions-intro"><span className="exhibitions-eyebrow">FOR YOUR NEXT SPACE</span><h1>공간의 다음 가능성을 함께.</h1><p>작은 전시부터 브랜드 팝업까지, 목적과 규모에 맞는 운영 방식을 만나보세요.</p></header>
    {error?<div className="exhibition-message" role="alert"><p>{error}</p><button onClick={()=>setRetry(v=>v+1)}>다시 불러오기</button></div>:plans===null?<p role="status">요금제를 불러오고 있어요…</p>:plans.length?<div className="business-plans">{plans.map(plan=><article key={plan.id} className="business-plan"><h2>{plan.name}</h2><p>{plan.summary}</p><strong className="business-price">{priceText(plan)}</strong>{plan.priceNote&&<small>{plan.priceNote}</small>}<ul>{plan.features.map((feature,i)=><li key={i}>{feature}</li>)}</ul><Link className="discovery-primary" to={`/cs?plan=${encodeURIComponent(plan.name)}`}>도입 문의하기 ↗</Link></article>)}</div>:<section className="business-empty"><h2>어떤 공간을 계획하고 있나요?</h2><p>전시 목적과 일정, 예상 규모를 알려주시면 알맞은 구성을 안내해 드려요.</p><Link className="discovery-primary" to="/cs?plan=맞춤%20구성">맞춤 도입 문의 ↗</Link></section>}
    <section className="business-pricing-note"><h2>이렇게 시작해요</h2><ol><li><strong>필요한 구성 선택</strong><p>전시 목적과 운영 일정에 맞는 요금제를 확인해요.</p></li><li><strong>도입 상담</strong><p>선택한 구성을 바탕으로 세부 조건과 최종 금액을 안내받아요.</p></li><li><strong>공간 준비와 공개</strong><p>협의한 내용에 맞춰 전시 제작과 운영을 준비해요.</p></li></ol><p className="business-muted">현재 요금제는 도입 상담으로 신청해요. 문의만으로 결제되거나 이용 권한이 변경되지 않아요.</p><Link to="/product">뚝딱 제작 도구 알아보기 →</Link></section>
  </div>;
}
