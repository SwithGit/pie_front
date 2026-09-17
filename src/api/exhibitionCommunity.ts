import { request, PublicGallery, GalleryPage } from "./publicGalleries";
export interface Creator { nickname:string; displayName:string; bio:string; avatarUrl:string; websiteUrl:string; }
export interface ReviewedGallery extends PublicGallery { reviewStatus:string; reviewNote:string; contentHash:string; publicationPublic?:boolean; }
export interface ReviewPage { galleries:ReviewedGallery[];page:number;totalPages:number; }
export interface Report { id:number;code:string;title:string;reason:string;details:string;status:string;resolution:string;contentHash:string|null;createdAt:string; }
export const hasSession=()=>!!localStorage.getItem("token");
const codePath=(code:string)=>`/${encodeURIComponent(code)}`;
export const getReaction=(code:string,signal?:AbortSignal)=>request<{saved:boolean;liked:boolean}>(`${codePath(code)}/reaction`,signal,undefined,true);
export const setReaction=(code:string,kind:"saved"|"liked",value:boolean)=>request<{success:boolean;webLikes:number}>(`${codePath(code)}/reaction`,undefined,{kind,value},true,"PUT");
export const getLibrary=(kind:string,page:number,signal?:AbortSignal)=>request<GalleryPage>(`/me/library?${new URLSearchParams({kind,page:String(page)})}`,signal,undefined,true);
export const clearRecent=()=>request<{success:boolean}>("/me/recent",undefined,undefined,true,"DELETE");
export const getRelated=(code:string,signal?:AbortSignal)=>request<{galleries:PublicGallery[]}>(`${codePath(code)}/related`,signal);
export const getCreator=(nickname:string,page:number,signal?:AbortSignal)=>request<{profile:Creator}&GalleryPage>(`/creators/${encodeURIComponent(nickname)}?page=${page}`,signal);
export const getMyCreator=(signal?:AbortSignal)=>request<{profile:Creator}>("/me/profile",signal,undefined,true);
export const saveCreator=(body:Creator)=>request<{success:boolean;nickname:string}>("/me/profile",undefined,body,true,"PUT");
export const getMyExhibitions=(page:number,signal?:AbortSignal)=>request<ReviewPage>(`/me/exhibitions?page=${page}`,signal,undefined,true);
export const requestReview=(code:string)=>request<{success:boolean}>(`${codePath(code)}/request-review`,undefined,{},true);
export const reportExhibition=(code:string,reason:string,details:string)=>request<{success:boolean}>(`${codePath(code)}/reports`,undefined,{reason,details},true);
export const getReviewQueue=(status:string,page:number,signal?:AbortSignal)=>request<ReviewPage>(`/management/reviews?${new URLSearchParams({status,page:String(page)})}`,signal,undefined,true);
export const decideReview=(code:string,status:string,contentHash:string,note:string)=>request<{success:boolean}>(`/management/reviews/${encodeURIComponent(code)}`,undefined,{status,contentHash,note},true,"PUT");
export const getReports=(status:string,page:number,signal?:AbortSignal)=>request<{reports:Report[];page:number;totalPages:number}>(`/management/reports?${new URLSearchParams({status,page:String(page)})}`,signal,undefined,true);
export const resolveReport=(id:number,status:string,note:string)=>request<{success:boolean}>(`/management/reports/${id}`,undefined,{status,note},true,"PUT");
let memoryVisitor="";
function visitorId() {
  try {const stored=localStorage.getItem("ddukddak-visitor");if(stored && /^[a-f0-9-]{36}$/i.test(stored)) return stored;}catch {}
  if(!memoryVisitor) {
    const bytes=crypto.getRandomValues(new Uint8Array(16));bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
    const hex=Array.from(bytes,byte=>byte.toString(16).padStart(2,'0')).join('');
    memoryVisitor=[hex.slice(0,8),hex.slice(8,12),hex.slice(12,16),hex.slice(16,20),hex.slice(20)].join('-');
  }
  try {localStorage.setItem("ddukddak-visitor",memoryVisitor);}catch {}
  return memoryVisitor;
}
export const recordVisit=async(code:string)=>request<{success:boolean}>(`${codePath(code)}/visit`,undefined,{visitorId:visitorId()},hasSession());
