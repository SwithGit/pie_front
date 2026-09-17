import { request, PublicGallery } from "./publicGalleries";
import { hasSession, visitorId } from "./exhibitionCommunity";
export interface Offer {id:string;code:string;kind:string;title:string;description:string;url:string;couponCode?:string;startsOn:string|null;endsOn:string|null;enabled:boolean;sortOrder:number;reviewStatus:string;reviewNote:string;revision:number;}
export interface Promotion {id:string;code:string;title:string;description:string;sponsor:string;startsOn:string;endsOn:string;enabled:boolean;sortOrder:number;revision:number;gallery?:PublicGallery;}
export interface Plan {id:string;name:string;summary:string;priceKrw:number|null;billingUnit:string;priceNote:string;features:string[];enabled:boolean;sortOrder:number;revision:number;}
export type Metrics={views:number;entry_start:number;product_click:number;reservation_click:number;coupon_reveal:number;promotion_click:number};
export interface Analytics {code:string;title:string;from:string;to:string;days:number;totals:Metrics;current:{saved:number;liked:number};daily:({day:string}&Metrics)[];offers:{id:string;title:string;kind:string;total:number}[];}
const part=encodeURIComponent;
export const getOffers=(code:string,own=false,signal?:AbortSignal)=>request<{offers:Offer[]}>(`${own?'/me':''}/business/${part(code)}/offers`,signal,undefined,own);
export const saveOffer=(code:string,offer:Offer)=>request<{success:boolean;id:string}>(`/me/business/${part(code)}/offers${offer.id?'/'+part(offer.id):''}`,undefined,offer,true,offer.id?'PUT':'POST');
export const activateOffer=async(id:string)=>request<{url:string;couponCode?:string}>(`/business/offers/${part(id)}/action`,undefined,{visitorId:visitorId()},hasSession());
export const trackEntry=async(code:string)=>request<{success:boolean}>(`/business/${part(code)}/entry`,undefined,{visitorId:visitorId()},hasSession());
export const getAnalytics=(code:string,days:number,signal?:AbortSignal)=>request<Analytics>(`/me/business/${part(code)}/analytics?days=${days}`,signal,undefined,true);
export const getPromotions=(admin=false,signal?:AbortSignal)=>request<{promotions:Promotion[]}>(`${admin?'/management':''}/business/promotions`,signal,undefined,admin);
export const savePromotion=(value:Promotion)=>request<{success:boolean;id:string}>(`/management/business/promotions${value.id?'/'+part(value.id):''}`,undefined,value,true,value.id?'PUT':'POST');
export const trackPromotion=async(id:string)=>request<{success:boolean}>(`/business/promotions/${part(id)}/click`,undefined,{visitorId:visitorId()},hasSession());
export const getPlans=(admin=false,signal?:AbortSignal)=>request<{plans:Plan[]}>(`${admin?'/management':''}/business/plans`,signal,undefined,admin);
export const savePlan=(value:Plan)=>request<{success:boolean;id:string}>(`/management/business/plans${value.id?'/'+part(value.id):''}`,undefined,value,true,value.id?'PUT':'POST');
export const getOfferReviews=(status:string,page:number,signal?:AbortSignal)=>request<{offers:Offer[];page:number;totalPages:number}>(`/management/business/offers?${new URLSearchParams({status,page:String(page)})}`,signal,undefined,true);
export const decideOffer=(offer:Offer,status:string,note:string)=>request<{success:boolean}>(`/management/business/offers/${part(offer.id)}`,undefined,{revision:offer.revision,status,note},true,'PUT');
