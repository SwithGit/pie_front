import React, { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { getCurationAccess } from "../../api/publicGalleries";
import * as api from "../../api/exhibitionCommunity";
import ExhibitionCard, { Thumbnail } from "./ExhibitionCard";
import "./exhibitions.css";
import "./community.css";

function useLoad<T>(load:(signal:AbortSignal)=>Promise<T>,deps:unknown[],enabled=true) {
  const [data,setData]=useState<T|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(enabled),[version,setVersion]=useState(0);
  useEffect(()=>{if(!enabled){setData(null);setLoading(false);return;}const controller=new AbortController();setLoading(true);setError('');setData(null);
    load(controller.signal).then(result=>{if(!controller.signal.aborted)setData(result);}).catch(e=>{if(!controller.signal.aborted)setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();
    // The caller supplies all request dependencies; load is intentionally inline.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[...deps,enabled,version]);
  return {data,error,loading,reload:()=>setVersion(v=>v+1)};
}
function Page({title,description,children}:{title:string;description:string;children:React.ReactNode}) {
  return <div className="exhibitions-page community-page"><nav className="community-nav" aria-label="전시 계정 메뉴"><Link to="/">홈</Link><Link to="/mypage/exhibitions">전시 보관함</Link><Link to="/mypage/creator">공개 프로필</Link><Link to="/mypage/publications">내 전시 심사</Link><Link to="/mypage/business">전시 통계·연결</Link><Link to="/mypage">계정</Link></nav><header className="exhibitions-intro"><span className="exhibitions-eyebrow">DDUKDDAK · YOUR SPACE</span><h1>{title}</h1><p>{description}</p></header>{children}</div>;
}
function Login({next}:{next:string}){return <div className="exhibition-message"><h2>로그인하고 이어서 이용하세요</h2><p>찜한 전시와 최근 본 공간을 계정에 보관할 수 있어요.</p><Link className="discovery-primary" to={`/signin?next=${encodeURIComponent(next)}`}>로그인하기</Link></div>;}
function Result({loading,error,reload}:{loading:boolean;error:string;reload:()=>void}){return loading?<p role="status">불러오는 중이에요…</p>:error?<div className="exhibition-message" role="alert"><p>{error}</p><button onClick={reload}>다시 불러오기</button></div>:null;}
function Pagination({page,total,onChange}:{page:number;total:number;onChange:(page:number)=>void}){return total>1?<nav className="exhibition-pagination" aria-label="목록 페이지"><button disabled={page<=1} onClick={()=>onChange(page-1)}>이전</button><span>{page} / {total}</span><button disabled={page>=total} onClick={()=>onChange(page+1)}>다음</button></nav>:null;}
const statusLabel=(status:string)=>({pending:'심사 대기',approved:'승인',rejected:'반려',blocked:'차단'}[status]||status);

export function ExhibitionLibrary(){
  const [params,setParams]=useSearchParams();const kind=params.get('kind')||'saved',page=Math.max(1,Number(params.get('page'))||1),signedIn=api.hasSession();
  const result=useLoad(signal=>api.getLibrary(kind,page,signal),[kind,page],signedIn);
  const [notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[confirmClear,setConfirmClear]=useState(false);
  async function remove(code:string){setBusy(true);try{await api.setReaction(code,kind==='liked'?'liked':'saved',false);result.reload();setNotice('목록에서 해제했어요.');}catch(e){setNotice((e as Error).message);}finally{setBusy(false);}}
  async function clear(){setBusy(true);try{await api.clearRecent();setConfirmClear(false);result.reload();setNotice('최근 본 기록을 지웠어요.');}catch(e){setNotice((e as Error).message);}finally{setBusy(false);}}
  return <Page title="다시 만나고 싶은 공간" description="찜한 팝업부터 최근 둘러본 전시까지, 한곳에서 이어서 만나보세요.">{!signedIn?<Login next="/mypage/exhibitions"/>:<>
    <nav className="exhibition-filter-chips" aria-label="보관함 분류">{[['saved','찜한 전시'],['recent','최근 본 전시'],['liked','좋아요한 전시']].map(([value,label])=><button key={value} aria-pressed={kind===value} onClick={()=>{setParams({kind:value});setConfirmClear(false);}}>{label}</button>)}</nav>
    <p className="community-muted">현재 공개 중인 전시만 표시됩니다. 종료·비공개 전시는 목록에서 잠시 숨겨져요.</p>
    {kind==='recent'&&!!result.data?.galleries.length&&<div className="community-clear">{confirmClear?<><span>최근 본 기록을 모두 지울까요?</span><button disabled={busy} onClick={clear}>기록 지우기</button><button onClick={()=>setConfirmClear(false)}>취소</button></>:<button onClick={()=>setConfirmClear(true)}>최근 본 기록 지우기</button>}</div>}
    <Result {...result}/>{notice&&<p role="status">{notice}</p>}
    {result.data&&(result.data.galleries.length?<div className="exhibition-grid">{result.data.galleries.map(item=><div key={item.code}><ExhibitionCard gallery={item}/>{kind!=='recent'&&<button className="community-remove" disabled={busy} onClick={()=>remove(item.code)}>목록에서 해제</button>}</div>)}</div>:<div className="exhibition-message"><h2>아직 보관한 공간이 없어요</h2><Link to="/galleries">팝업·전시 둘러보기 →</Link></div>)}
    <Pagination page={page} total={result.data?.totalPages||0} onChange={next=>setParams({kind,page:String(next)})}/>
  </>}</Page>;
}

export function CreatorProfile(){
  const {nickname=''}=useParams();const [params,setParams]=useSearchParams();const page=Math.max(1,Number(params.get('page'))||1);
  const result=useLoad(signal=>api.getCreator(nickname,page,signal),[nickname,page]);
  const [avatarFailed,setAvatarFailed]=useState(false);useEffect(()=>setAvatarFailed(false),[nickname,result.data?.profile.avatarUrl]);
  return <div className="exhibitions-page community-page"><Link className="discovery-back" to="/galleries">← 팝업·전시 둘러보기</Link><Result {...result}/>{result.data&&<>
    <header className="creator-profile"><div className="creator-avatar">{result.data.profile.avatarUrl&&!avatarFailed?<img src={result.data.profile.avatarUrl} alt="" onError={()=>setAvatarFailed(true)}/>:<span>{result.data.profile.displayName.slice(0,1)}</span>}</div><div><span className="exhibitions-eyebrow">CREATOR · BRAND</span><h1>{result.data.profile.displayName}</h1><p className="community-muted">@{result.data.profile.nickname}</p><p className="creator-bio">{result.data.profile.bio||'공간으로 이야기를 전하는 제작자입니다.'}</p>{result.data.profile.websiteUrl&&<a href={result.data.profile.websiteUrl} target="_blank" rel="noopener noreferrer nofollow" className="creator-website">웹사이트 방문 ↗</a>}</div></header>
    <section className="discovery-section"><header className="discovery-section-head"><h2>열려 있는 공간 <small>{result.data.totalItems}</small></h2></header>{result.data.galleries.length?<div className="exhibition-grid">{result.data.galleries.map(item=><ExhibitionCard key={item.code} gallery={item}/>)}</div>:<div className="exhibition-message">현재 공개 중인 전시가 없어요.</div>}<Pagination page={page} total={result.data.totalPages} onChange={next=>setParams({page:String(next)})}/></section>
  </>}</div>;
}

export function CreatorSettings(){
  const signedIn=api.hasSession(),result=useLoad(api.getMyCreator,[],signedIn);
  const [form,setForm]=useState<api.Creator|null>(null),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
  useEffect(()=>{if(result.data)setForm(result.data.profile);},[result.data]);
  async function save(e:React.FormEvent){e.preventDefault();if(!form)return;setBusy(true);setNotice('');try{await api.saveCreator(form);setNotice('공개 프로필을 저장했어요.');}catch(e){setNotice((e as Error).message);}finally{setBusy(false);}}
  return <Page title="제작자·브랜드 프로필" description="관람객에게 보여줄 이름과 소개를 작성해 주세요. 입력한 내용은 공개 프로필에 표시됩니다.">{!signedIn?<Login next="/mypage/creator"/>:<><Result {...result}/>{form&&<form className="exhibition-curation-form community-profile-form" onSubmit={save}>
    <label>제작자·브랜드 이름<input required maxLength={100} value={form.displayName} onChange={e=>setForm({...form,displayName:e.target.value})}/></label><label>소개<textarea rows={5} maxLength={1000} value={form.bio} onChange={e=>setForm({...form,bio:e.target.value})}/></label><label>프로필 이미지 주소<input type="url" maxLength={1000} placeholder="https://..." value={form.avatarUrl} onChange={e=>setForm({...form,avatarUrl:e.target.value})}/></label><label>웹사이트<input type="url" maxLength={1000} placeholder="https://..." value={form.websiteUrl} onChange={e=>setForm({...form,websiteUrl:e.target.value})}/></label><button className="discovery-primary" disabled={busy}>{busy?'저장 중…':'공개 프로필 저장'}</button><Link to={`/creators/${encodeURIComponent(form.nickname)}`}>내 공개 프로필 보기 ↗</Link></form>}{notice&&<p role="status">{notice}</p>}</>}</Page>;
}

export function MyExhibitions(){
  const [page,setPage]=useState(1),signedIn=api.hasSession(),result=useLoad(signal=>api.getMyExhibitions(page,signal),[page],signedIn);
  const [notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
  async function submit(code:string){setBusy(true);try{await api.requestReview(code);setNotice('재심사를 요청했어요.');result.reload();}catch(e){setNotice((e as Error).message);}finally{setBusy(false);}}
  return <Page title="내 전시 공개 심사" description="제작 프로그램에서 발행한 전시의 심사 상태를 확인하세요. 신규 전시와 내용을 수정한 전시는 공개 승인 후 관람할 수 있어요.">{!signedIn?<Login next="/mypage/publications"/>:<><Result {...result}/>{notice&&<p role="status">{notice}</p>}<div className="community-review-list">{result.data?.galleries.map(item=><article key={item.code} className="community-review-card"><Thumbnail gallery={item}/><div><span className={`community-status ${item.reviewStatus}`}>{statusLabel(item.reviewStatus)}</span><h2>{item.title}</h2><p className="community-muted">{item.publicationPublic?'제작 프로그램에서 공개로 설정됨':'제작 프로그램에서 비공개로 설정됨'}</p>{item.reviewNote&&<p>운영자 안내: {item.reviewNote}</p>}{item.reviewStatus==='approved'&&item.publicationPublic&&<Link to={`/exhibitions/${item.code}`}>공개 페이지 확인 →</Link>}{item.reviewStatus==='rejected'&&<button disabled={busy} onClick={()=>submit(item.code)}>수정 후 재심사 요청</button>}{item.reviewStatus==='pending'&&<p>검토 중이에요. 승인 후 공개 기간에 맞춰 노출됩니다.</p>}{item.reviewStatus==='blocked'&&<Link to="/cs">차단 사유 문의하기 →</Link>}</div></article>)}</div>{result.data&&!result.data.galleries.length&&<div className="exhibition-message"><p>아직 발행한 전시가 없어요.</p><Link to="/download">뚝딱으로 제작하기 →</Link></div>}<Pagination page={page} total={result.data?.totalPages||0} onChange={setPage}/></>}</Page>;
}

function ReviewItem({item,reload}:{item:api.ReviewedGallery;reload:()=>void}){
  const [note,setNote]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  async function decide(status:string){setBusy(true);setMessage('');try{await api.decideReview(item.code,status,item.contentHash,note);reload();}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}}
  return <article className="community-review-card"><Thumbnail gallery={item}/><div><span className={`community-status ${item.reviewStatus}`}>{statusLabel(item.reviewStatus)}</span><h2>{item.title}</h2><p>{item.creator}</p><p className="creator-bio">{item.description||'소개 문구 없음'}</p>{item.reviewNote&&<p>이전 사유: {item.reviewNote}</p>}<Link to={`/admin/exhibitions?code=${encodeURIComponent(item.code)}`}>분류·추천 설정 →</Link><label>심사 사유<textarea aria-label={`${item.title} 심사 사유`} value={note} maxLength={500} rows={2} onChange={e=>setNote(e.target.value)} placeholder="반려·차단 시 5자 이상 작성"/></label><div className="community-action-row"><button disabled={busy} onClick={()=>decide('approved')}>공개 승인</button><button disabled={busy||note.trim().length<5} onClick={()=>decide('rejected')}>반려</button><button disabled={busy||note.trim().length<5} onClick={()=>decide('blocked')}>전시 차단</button></div>{message&&<p role="alert">{message}</p>}</div></article>;
}
function ReportItem({item,reload}:{item:api.Report;reload:()=>void}){
  const [note,setNote]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  async function action(status:string){setBusy(true);setMessage('');try{if(status==='blocked'){if(!item.contentHash)return;await api.decideReview(item.code,'blocked',item.contentHash,note);setMessage('전시를 차단했어요. 이어서 신고를 처리 완료해 주세요.');}else{await api.resolveReport(item.id,status,note);reload();}}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}}
  return <article className="community-report-card"><h2>{item.title||item.code}</h2><p className="community-muted">신고 #{item.id} · {({copyright:'저작권 침해',harmful:'유해 콘텐츠',misleading:'허위·사칭',other:'기타'}[item.reason]||item.reason)}</p><p className="creator-bio">{item.details}</p><Link to={`/admin/exhibitions?code=${encodeURIComponent(item.code)}`}>전시 정보 확인 →</Link>{item.status==='open'?<><label>처리 사유<textarea aria-label={`신고 ${item.id} 처리 사유`} rows={2} maxLength={500} value={note} onChange={e=>setNote(e.target.value)}/></label><p className="community-muted">전시 차단과 신고 처리는 별개예요. 공개를 중단하려면 먼저 전시를 차단하세요.</p><div className="community-action-row"><button disabled={busy||note.trim().length<5||!item.contentHash} onClick={()=>action('blocked')}>전시 차단</button><button disabled={busy||note.trim().length<5} onClick={()=>action('resolved')}>처리 완료</button><button disabled={busy||note.trim().length<5} onClick={()=>action('dismissed')}>신고 기각</button></div></>:<p>처리 사유: {item.resolution}</p>}{message&&<p role="status">{message}</p>}</article>;
}
export function ExhibitionModeration(){
  const access=useLoad(getCurationAccess,[]),[tab,setTab]=useState('reviews'),[status,setStatus]=useState('pending'),[page,setPage]=useState(1);
  const allowed=!!access.data?.isPlatformAdmin;
  const reviews=useLoad(signal=>api.getReviewQueue(status,page,signal),[status,page],allowed&&tab==='reviews');
  const reports=useLoad(signal=>api.getReports(status,page,signal),[status,page],allowed&&tab==='reports');
  function changeTab(value:string){setTab(value);setStatus(value==='reviews'?'pending':'open');setPage(1);}
  return <Page title="공개 심사 · 신고 관리" description="전시 제목·소개·대표 이미지를 확인하고 공개 여부를 결정하세요."><Link to="/admin/exhibitions">← 홈 노출 관리</Link> · <Link to="/admin/business">프로모션·요금제·연결 심사 →</Link><Result {...access}/>{allowed&&<>
    <nav className="exhibition-filter-chips" aria-label="관리 종류"><button aria-pressed={tab==='reviews'} onClick={()=>changeTab('reviews')}>공개 심사</button><button aria-pressed={tab==='reports'} onClick={()=>changeTab('reports')}>접수된 신고</button></nav>
    <label>상태 <select aria-label="관리 상태" value={status} onChange={e=>{setStatus(e.target.value);setPage(1);}}>{(tab==='reviews'?[['pending','심사 대기'],['approved','승인'],['rejected','반려'],['blocked','차단']]:[['open','접수'],['resolved','처리 완료'],['dismissed','기각']]).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
    <Result {...(tab==='reviews'?reviews:reports)}/>{tab==='reviews'?<div className="community-review-list">{reviews.data?.galleries.map(item=><ReviewItem key={item.code} item={item} reload={reviews.reload}/>)}{reviews.data&&!reviews.data.galleries.length&&<p>해당 상태의 전시가 없어요.</p>}</div>:<div className="community-review-list">{reports.data?.reports.map(item=><ReportItem key={item.id} item={item} reload={reports.reload}/>)}{reports.data&&!reports.data.reports.length&&<p>해당 상태의 신고가 없어요.</p>}</div>}
    <Pagination page={page} total={(tab==='reviews'?reviews.data:reports.data)?.totalPages||0} onChange={setPage}/>
  </>}</Page>;
}
