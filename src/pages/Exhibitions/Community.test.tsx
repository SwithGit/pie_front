import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ExhibitionActions } from "./CommunityDetail";
import { ExhibitionLibrary, CreatorProfile, ExhibitionModeration, MyExhibitions } from "./CommunityPages";
import * as api from "../../api/exhibitionCommunity";
import { getCurationAccess, PublicGallery } from "../../api/publicGalleries";
jest.mock("../../api/exhibitionCommunity");
jest.mock("../../api/publicGalleries",()=>({...jest.requireActual("../../api/publicGalleries"),getCurationAccess:jest.fn()}));
const mock=api as jest.Mocked<typeof api>;
const item:PublicGallery={code:'abc-123',title:'봄의 공간',creator:'creator',description:'새로운 공간',thumbnailUrls:[],startDate:null,endDate:null,alwaysOpen:true,views:5,likes:0,webLikes:2};
const reviewed={...item,reviewStatus:'pending',reviewNote:'',contentHash:'a'.repeat(64),publicationPublic:true};
function mount(element:React.ReactElement,url='/',path='*'){return render(<MemoryRouter initialEntries={[url]}><Routes><Route path={path} element={element}/><Route path="/signin" element={<p>로그인 화면</p>}/></Routes></MemoryRouter>);}
beforeEach(()=>{jest.clearAllMocks();mock.hasSession.mockReturnValue(true);mock.recordVisit.mockResolvedValue({success:true});mock.getReaction.mockResolvedValue({saved:false,liked:false});});
test('guest reaction leads to login without mutation',async()=>{
  mock.hasSession.mockReturnValue(false);mount(<ExhibitionActions gallery={item}/>);
  fireEvent.click(screen.getByRole('button',{name:'♡ 찜하기'}));
  expect(await screen.findByText('로그인 화면')).toBeInTheDocument();
  expect(mock.setReaction).not.toHaveBeenCalled();
});
test('reactions retry errors, send desired state and do not fake success on failure',async()=>{
  mock.getReaction.mockRejectedValueOnce(new Error('잠시 연결 오류'));
  mock.setReaction.mockResolvedValueOnce({success:true,webLikes:2}).mockRejectedValueOnce(new Error('저장 실패'));
  mount(<ExhibitionActions gallery={item}/>);
  fireEvent.click(await screen.findByRole('button',{name:'반응 다시 불러오기'}));
  await waitFor(()=>expect(screen.getByRole('button',{name:'♡ 찜하기'})).toBeEnabled());
  fireEvent.click(screen.getByRole('button',{name:'♡ 찜하기'}));
  expect(await screen.findByRole('button',{name:'찜 해제'})).toHaveAttribute('aria-pressed','true');
  expect(mock.setReaction).toHaveBeenCalledWith('abc-123','saved',true);
  fireEvent.click(screen.getByRole('button',{name:'찜 해제'}));
  expect(await screen.findByRole('status')).toHaveTextContent('저장 실패');
  expect(screen.getByRole('button',{name:'찜 해제'})).toHaveAttribute('aria-pressed','true');
});
test('report submits explanation and handles duplicate response',async()=>{
  mock.reportExhibition.mockRejectedValue(new Error('이미 접수한 전시예요.'));
  mount(<ExhibitionActions gallery={item}/>);
  fireEvent.click(screen.getByRole('button',{name:'전시 신고'}));
  fireEvent.change(screen.getByLabelText('신고 사유'),{target:{value:'misleading'}});
  fireEvent.change(screen.getByLabelText('신고 내용'),{target:{value:'브랜드를 사칭하고 있어요'}});
  fireEvent.click(screen.getByRole('button',{name:'신고 접수'}));
  expect(await screen.findByRole('status')).toHaveTextContent('이미 접수한');
  expect(mock.reportExhibition).toHaveBeenCalledWith('abc-123','misleading','브랜드를 사칭하고 있어요');
});
test('recent history requires an explicit clear action and refreshes after completion',async()=>{
  mock.getLibrary.mockResolvedValueOnce({galleries:[item],page:1,totalPages:1,totalItems:1}).mockResolvedValue({galleries:[],page:1,totalPages:0,totalItems:0});
  mock.clearRecent.mockResolvedValue({success:true});
  mount(<ExhibitionLibrary/>,'/mypage/exhibitions?kind=recent');
  fireEvent.click(await screen.findByRole('button',{name:'최근 본 기록 지우기'}));
  expect(mock.clearRecent).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'기록 지우기'}));
  expect(await screen.findByText('아직 보관한 공간이 없어요')).toBeInTheDocument();
  expect(mock.clearRecent).toHaveBeenCalledTimes(1);
});
test('creator profile renders public name, text and safe external website attributes',async()=>{
  mock.getCreator.mockResolvedValue({profile:{nickname:'creator',displayName:'봄 브랜드',bio:'<script>literal text</script>',avatarUrl:'',websiteUrl:'https://example.com'},galleries:[item],page:1,totalPages:1,totalItems:1});
  mount(<CreatorProfile/>,'/creators/creator','/creators/:nickname');
  expect(await screen.findByRole('heading',{name:'봄 브랜드'})).toBeInTheDocument();
  expect(screen.getByText('<script>literal text</script>')).toBeInTheDocument();
  expect(screen.getByRole('link',{name:'웹사이트 방문 ↗'})).toHaveAttribute('rel','noopener noreferrer nofollow');
});
test('ordinary account cannot load review and report queues',async()=>{
  (getCurationAccess as jest.Mock).mockRejectedValue(new Error('운영자만 접근할 수 있어요.'));
  mount(<ExhibitionModeration/>);
  expect(await screen.findByRole('alert')).toHaveTextContent('운영자만');
  expect(mock.getReviewQueue).not.toHaveBeenCalled();expect(mock.getReports).not.toHaveBeenCalled();
});
test('admin approval includes the reviewed snapshot hash and displays concurrent-change conflicts',async()=>{
  (getCurationAccess as jest.Mock).mockResolvedValue({isPlatformAdmin:true});
  mock.getReviewQueue.mockResolvedValue({galleries:[reviewed],page:1,totalPages:1});
  mock.decideReview.mockRejectedValue(new Error('전시 내용이 변경되었어요. 새로 확인해 주세요.'));
  mount(<ExhibitionModeration/>);
  fireEvent.click(await screen.findByRole('button',{name:'공개 승인'}));
  expect(await screen.findByRole('alert')).toHaveTextContent('전시 내용이 변경');
  expect(mock.decideReview).toHaveBeenCalledWith(item.code,'approved',reviewed.contentHash,'');
  expect(screen.getByRole('button',{name:'반려'})).toBeDisabled();
});
test('blocked exhibitions expose support instead of a self-service approval bypass',async()=>{
  mock.getMyExhibitions.mockResolvedValue({galleries:[{...reviewed,reviewStatus:'blocked',reviewNote:'운영 정책 확인이 필요합니다'}],page:1,totalPages:1});
  mount(<MyExhibitions/>);
  expect(await screen.findByRole('link',{name:'차단 사유 문의하기 →'})).toHaveAttribute('href','/cs');
  expect(screen.queryByRole('button',{name:'수정 후 재심사 요청'})).not.toBeInTheDocument();
});
