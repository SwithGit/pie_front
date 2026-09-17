import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PublicGallery } from "../../api/publicGalleries";
import { getReaction, setReaction, hasSession, getRelated, recordVisit, reportExhibition } from "../../api/exhibitionCommunity";
import ExhibitionCard from "./ExhibitionCard";
import "./community.css";

export function ExhibitionActions({gallery}:{gallery:PublicGallery}) {
  const [reaction,setState]=useState<{saved:boolean;liked:boolean}|null>(null);
  const [likes,setLikes]=useState(gallery.webLikes||0),[busy,setBusy]=useState(false),[notice,setNotice]=useState("");
  const [reporting,setReporting]=useState(false),[reason,setReason]=useState(""),[details,setDetails]=useState("");
  const navigate=useNavigate(),signedIn=hasSession();
  const [retry,setRetry]=useState(0);
  useEffect(()=>{
    const controller=new AbortController();setState(null);setLikes(gallery.webLikes||0);setNotice("");setReporting(false);
    recordVisit(gallery.code).catch(()=>{/* Optional analytics never blocks viewing. */});
    if(signedIn) getReaction(gallery.code,controller.signal).then(data=>{if(!controller.signal.aborted)setState(data);}).catch(e=>{if(!controller.signal.aborted)setNotice(e.message);});
    return ()=>controller.abort();
  },[gallery.code,gallery.webLikes,signedIn,retry]);
  function login(){navigate(`/signin?next=${encodeURIComponent(`/exhibitions/${gallery.code}`)}`);}
  async function react(kind:"saved"|"liked") {
    if(!signedIn){login();return;} if(!reaction)return;
    setBusy(true);setNotice("");
    try {const value=!reaction[kind],result=await setReaction(gallery.code,kind,value);setState({...reaction,[kind]:value});setLikes(result.webLikes);setNotice(kind==='saved'?(value?'찜한 전시에 저장했어요.':'찜을 해제했어요.'):(value?'좋아요를 남겼어요.':'좋아요를 취소했어요.'));}
    catch(e){setNotice((e as Error).message);}finally{setBusy(false);}
  }
  async function report(e:React.FormEvent){e.preventDefault();setBusy(true);setNotice("");try{await reportExhibition(gallery.code,reason,details);setReporting(false);setDetails("");setNotice("신고를 접수했어요. 운영자가 확인 후 처리합니다.");}catch(e){setNotice((e as Error).message);}finally{setBusy(false);}}
  return <div className="community-actions"><div className="community-action-row"><button aria-pressed={!!reaction?.saved} disabled={busy||(signedIn&&!reaction)} onClick={()=>react('saved')}>{reaction?.saved?'찜 해제':'♡ 찜하기'}</button><button aria-pressed={!!reaction?.liked} disabled={busy||(signedIn&&!reaction)} onClick={()=>react('liked')}>{reaction?.liked?'♥':'♡'} 좋아요 {likes}</button></div>
    <div className="community-minor-row"><Link to="/mypage/exhibitions">내 전시 보관함 →</Link><button onClick={()=>signedIn?setReporting(!reporting):login()} aria-expanded={reporting}>전시 신고</button></div>
    {reporting&&<form className="community-report-form" onSubmit={report}><label>신고 사유<select required value={reason} onChange={e=>setReason(e.target.value)}><option value="">선택해 주세요</option><option value="copyright">저작권 침해</option><option value="harmful">유해한 콘텐츠</option><option value="misleading">허위·사칭</option><option value="other">기타</option></select></label><label>신고 내용<textarea required minLength={5} maxLength={1000} rows={3} value={details} onChange={e=>setDetails(e.target.value)} placeholder="문제가 되는 내용과 위치를 알려주세요." /></label><button disabled={busy}>신고 접수</button><button type="button" disabled={busy} onClick={()=>setReporting(false)}>취소</button></form>}
    {notice&&<p role="status">{notice}</p>}{signedIn&&!reaction&&notice&&<button onClick={()=>setRetry(value=>value+1)}>반응 다시 불러오기</button>}
  </div>;
}
export function RelatedExhibitions({code}:{code:string}) {
  const [items,setItems]=useState<PublicGallery[]>([]);
  useEffect(()=>{const controller=new AbortController();setItems([]);getRelated(code,controller.signal).then(data=>{if(!controller.signal.aborted)setItems(data.galleries);}).catch(()=>{});return()=>controller.abort();},[code]);
  if(!items.length)return null;
  return <section className="discovery-section"><header className="discovery-section-head"><div><h2>이런 공간은 어때요?</h2><p>제작자와 관심사가 이어지는 공간을 만나보세요.</p></div></header><div className="exhibition-grid">{items.map(item=><ExhibitionCard key={item.code} gallery={item}/>)}</div></section>;
}
