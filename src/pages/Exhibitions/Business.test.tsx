import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { BusinessAdmin, CreatorBusiness } from "./BusinessPages";
import { BusinessPricing, ExhibitionOffers, PromotionShelf } from "./BusinessPublic";
import * as api from "../../api/exhibitionBusiness";
import * as community from "../../api/exhibitionCommunity";
import { getCurationAccess } from "../../api/publicGalleries";
jest.mock('../../api/exhibitionBusiness');
jest.mock('../../api/exhibitionCommunity');
jest.mock('../../api/publicGalleries',()=>({...jest.requireActual('../../api/publicGalleries'),getCurationAccess:jest.fn()}));
const mock=api as jest.Mocked<typeof api>;
const offer:api.Offer={id:'offer-id',code:'gallery',kind:'coupon',title:'관람객 쿠폰',description:'외부 사용처에서 적용',url:'https://shop.example.com',couponCode:'',startsOn:null,endsOn:null,enabled:true,sortOrder:0,reviewStatus:'pending',reviewNote:'',revision:2};
const plan:api.Plan={id:'plan-id',name:'브랜드 플랜',summary:'브랜드 공간 운영',priceKrw:99000,billingUnit:'month',priceNote:'예시 금액',features:['공간 운영 상담'],enabled:true,sortOrder:0,revision:1};
const zeros={views:0,entry_start:0,product_click:0,reservation_click:0,coupon_reveal:0,promotion_click:0};
const gallery={code:'gallery',title:'봄 팝업',creator:'maker',description:'소개',thumbnailUrls:[],startDate:null,endDate:null,alwaysOpen:true,views:0,likes:0,reviewStatus:'approved',reviewNote:'',contentHash:'a'};
function mount(element:React.ReactElement,url='/'){return render(<MemoryRouter initialEntries={[url]}>{element}</MemoryRouter>);}
beforeEach(()=>{jest.clearAllMocks();(community.hasSession as jest.Mock).mockReturnValue(true);(community.getMyExhibitions as jest.Mock).mockResolvedValue({galleries:[gallery],page:1,totalPages:1});mock.getPromotions.mockResolvedValue({promotions:[]});mock.getPlans.mockResolvedValue({plans:[plan]});mock.getOffers.mockResolvedValue({offers:[]});});
test('pricing uses configured money and quote mode with inquiry links, without payment action',async()=>{
 mock.getPlans.mockResolvedValue({plans:[plan,{...plan,id:'quote',name:'맞춤 플랜',priceKrw:null}]});mount(<BusinessPricing/>);
 expect(await screen.findByText('99,000원 / 월')).toBeInTheDocument();expect(screen.getByText('별도 협의')).toBeInTheDocument();
 expect(screen.getAllByRole('link',{name:'도입 문의하기 ↗'})[0]).toHaveAttribute('href','/cs?plan='+encodeURIComponent(plan.name));
 expect(screen.queryByRole('button',{name:/결제/})).not.toBeInTheDocument();
});
test('empty pricing does not fabricate free or paid plans and request failure can retry',async()=>{
 mock.getPlans.mockRejectedValueOnce(new Error('조회 실패')).mockResolvedValueOnce({plans:[]});mount(<BusinessPricing/>);
 fireEvent.click(await screen.findByRole('button',{name:'다시 불러오기'}));
 expect(await screen.findByRole('link',{name:'맞춤 도입 문의 ↗'})).toBeInTheDocument();expect(screen.queryByText('0원')).not.toBeInTheDocument();
});
test('coupon reveals only after successful server action and copy reflects clipboard result',async()=>{
 mock.getOffers.mockResolvedValue({offers:[offer]});mock.activateOffer.mockResolvedValue({url:offer.url,couponCode:'SPRING20'});
 const copy=jest.fn().mockResolvedValue(undefined);Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:copy}});
 mount(<ExhibitionOffers code="gallery"/>);expect(screen.queryByDisplayValue('SPRING20')).not.toBeInTheDocument();
 fireEvent.click(await screen.findByRole('button',{name:'쿠폰 코드 확인'}));expect(await screen.findByDisplayValue('SPRING20')).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'코드 복사'}));expect(await screen.findByRole('status')).toHaveTextContent('복사되었어요');expect(copy).toHaveBeenCalledWith('SPRING20');expect(mock.activateOffer).toHaveBeenCalledWith('offer-id');
});
test('expired offer action reports failure without claiming coupon success',async()=>{
 mock.getOffers.mockResolvedValue({offers:[offer]});mock.activateOffer.mockRejectedValue(new Error('종료된 혜택이에요.'));mount(<ExhibitionOffers code="gallery"/>);
 fireEvent.click(await screen.findByRole('button',{name:'쿠폰 코드 확인'}));expect(await screen.findByRole('status')).toHaveTextContent('종료된');expect(screen.queryByRole('button',{name:'코드 복사'})).not.toBeInTheDocument();
});
test('sponsored exhibits show sponsor disclosure and record only a click',async()=>{
 mock.getPromotions.mockResolvedValue({promotions:[{id:'promo',code:'gallery',title:'봄과 만나는 공간',description:'소개',sponsor:'봄 브랜드',startsOn:'2026-09-01',endsOn:'2026-09-30',enabled:true,sortOrder:0,revision:1,gallery}]});mock.trackPromotion.mockResolvedValue({success:true});
 mount(<PromotionShelf/>);expect(await screen.findByText('광고 · 봄 브랜드')).toBeInTheDocument();expect(mock.trackPromotion).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('link',{name:/봄과 만나는 공간/}));expect(mock.trackPromotion).toHaveBeenCalledWith('promo');
});
test('guest cannot request creator analytics',()=>{
 (community.hasSession as jest.Mock).mockReturnValue(false);mount(<CreatorBusiness/>,'/mypage/business?code=gallery');expect(screen.getByRole('link',{name:'로그인하기 →'})).toHaveAttribute('href','/signin?next=/mypage/business');expect(mock.getAnalytics).not.toHaveBeenCalled();expect(community.getMyExhibitions).not.toHaveBeenCalled();
});
test('creator analytics changes range and clearly labels entry requests instead of completed visits',async()=>{
 mock.getAnalytics.mockResolvedValue({code:'gallery',title:'봄 팝업',from:'2026-09-01',to:'2026-09-30',days:30,totals:{...zeros,views:10,entry_start:4},daily:[{day:'2026-09-30',...zeros,views:10}],current:{saved:1,liked:2},offers:[]});
 mount(<CreatorBusiness/>,'/mypage/business?code=gallery');expect((await screen.findAllByText('관람 입장 요청'))[0]).toBeInTheDocument();
 fireEvent.change(screen.getByLabelText('집계 기간'),{target:{value:'7'}});await waitFor(()=>expect(mock.getAnalytics).toHaveBeenLastCalledWith('gallery',7,expect.any(AbortSignal)));
 expect(await screen.findByText(/실제 구매·예약 완료나 쿠폰 사용을 뜻하지 않아요/)).toBeInTheDocument();
});
test('ordinary users cannot fetch business admin data',async()=>{
 (getCurationAccess as jest.Mock).mockRejectedValue(new Error('운영자만 접근할 수 있어요.'));mount(<BusinessAdmin/>);expect(await screen.findByRole('alert')).toHaveTextContent('운영자만');expect(mock.getPlans).not.toHaveBeenCalled();expect(mock.getPromotions).not.toHaveBeenCalled();
});
test('admin saves a quote plan without inventing a price and preserves revision on edit',async()=>{
 (getCurationAccess as jest.Mock).mockResolvedValue({isPlatformAdmin:true});mock.getPlans.mockResolvedValue({plans:[]});mock.savePlan.mockResolvedValue({success:true,id:'new'});mount(<BusinessAdmin/>);
 fireEvent.click(await screen.findByRole('button',{name:'요금제',exact:true}));fireEvent.click(await screen.findByRole('button',{name:'요금제 추가 +'}));
 fireEvent.change(screen.getByLabelText('요금제 이름'),{target:{value:'브랜드 상담'}});fireEvent.change(screen.getByLabelText(/포함 구성/),{target:{value:'도입 상담\n전시 운영'}});fireEvent.click(screen.getByRole('button',{name:'요금제 저장'}));
 await waitFor(()=>expect(mock.savePlan).toHaveBeenCalledWith(expect.objectContaining({name:'브랜드 상담',priceKrw:null,features:['도입 상담','전시 운영'],enabled:false,revision:1})));
 expect(await screen.findByRole('button',{name:'요금제 추가 +'})).toBeInTheDocument();
});
test('offer review carries snapshot revision and displays conflict instead of false approval',async()=>{
 (getCurationAccess as jest.Mock).mockResolvedValue({isPlatformAdmin:true});mock.getOfferReviews.mockResolvedValue({offers:[offer],page:1,totalPages:1});mock.decideOffer.mockRejectedValue(new Error('다른 변경이 있어요. 다시 불러와 주세요.'));mount(<BusinessAdmin/>);
 fireEvent.click(await screen.findByRole('button',{name:'상품·예약·쿠폰 심사'}));fireEvent.click(await screen.findByRole('button',{name:'연결 승인'}));expect(await screen.findByRole('alert')).toHaveTextContent('다른 변경');expect(mock.decideOffer).toHaveBeenCalledWith(offer,'approved','');
});
