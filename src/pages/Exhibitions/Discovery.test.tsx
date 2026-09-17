jest.mock("./BusinessPublic", () => ({ExhibitionOffers:()=>null,PromotionShelf:()=>null}));
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import DiscoveryHome from "./DiscoveryHome";
import Exhibitions from "./Exhibitions";
import ExhibitionDetail from "./ExhibitionDetail";
import ExhibitionAdmin from "./ExhibitionAdmin";
import * as api from "../../api/publicGalleries";
jest.mock("./CommunityDetail", () => ({ ExhibitionActions: () => null, RelatedExhibitions: () => null }));
jest.mock("../../api/publicGalleries", () => ({ ...jest.requireActual("../../api/publicGalleries"), getDiscoveryHome: jest.fn(), listPublicGalleries: jest.fn(), getPublicGallery: jest.fn(), getCurationAccess: jest.fn(), getCuratedGallery: jest.fn(), saveCuration: jest.fn() }));
const item: api.PublicGallery = { code:"test-code",title:"테스트 팝업",creator:"브랜드",description:"우리의 이야기",thumbnailUrls:[],startDate:null,endDate:null,alwaysOpen:true,views:10,likes:0,category:"brand",tags:["디자인"] };
const mockHome = api.getDiscoveryHome as jest.Mock;
const mockList = api.listPublicGalleries as jest.Mock;
const mockDetail = api.getPublicGallery as jest.Mock;
function mount(element: React.ReactElement, url = "/", path = "*") {
  return render(<MemoryRouter initialEntries={[url]}><Routes><Route path={path} element={element} /></Routes></MemoryRouter>);
}
beforeEach(() => { jest.clearAllMocks(); mockList.mockResolvedValue({galleries:[item],page:1,totalPages:1,totalItems:1}); });
test("home links to detail, product and creation; no invented popular sections for sparse content", async () => {
  mockHome.mockResolvedValue({featured:[item],popular:[item],latest:[item],ending:[],totalItems:1});
  mount(<DiscoveryHome />);
  expect(await screen.findByRole("link",{name:"팝업·전시 둘러보기 ↗"})).toHaveAttribute("href","/exhibitions/test-code");
  expect(screen.getByRole("link",{name:"제작 도구 알아보기 →"})).toHaveAttribute("href","/product");
  expect(screen.queryByRole("heading",{name:"지금 많이 찾는 공간"})).not.toBeInTheDocument();
});
test("home recovers from request failure and has a real empty state", async () => {
  mockHome.mockRejectedValueOnce(new Error("연결 오류")).mockResolvedValueOnce({featured:[],popular:[],latest:[],ending:[],totalItems:0});
  mount(<DiscoveryHome />);
  fireEvent.click(await screen.findByRole("button",{name:"다시 불러오기"}));
  expect(await screen.findByText("지금은 공개된 전시가 없어요. 첫 번째 공간을 열어보세요.")).toBeInTheDocument();
});
test("changing category resets pagination and preserves search and tag", async () => {
  mount(<Exhibitions />, "/galleries?page=3&q=봄&tag=디자인");
  await screen.findByRole("heading",{name:item.title});
  fireEvent.click(screen.getByRole("button",{name:"예술·전시"}));
  await waitFor(() => expect(mockList).toHaveBeenLastCalledWith(1,"latest","봄",expect.any(AbortSignal),"art","디자인"));
  await screen.findByRole("heading",{name:item.title});
  fireEvent.click(screen.getByRole("button",{name:"디자인 태그 해제"}));
  await waitFor(() => expect(mockList).toHaveBeenLastCalledWith(1,"latest","봄",expect.any(AbortSignal),"art",""));
  await screen.findByRole("heading",{name:item.title});
});
test("detail offers explicit WebGL entry and metadata-based links", async () => {
  mockDetail.mockResolvedValue({gallery:item});
  mount(<ExhibitionDetail />, "/exhibitions/test-code", "/exhibitions/:code");
  expect(await screen.findByRole("link",{name:"전시 입장하기 ↗"})).toHaveAttribute("href","/ddookddak/test-code");
  expect(screen.getByRole("link",{name:"#디자인"})).toHaveAttribute("href","/galleries?tag=%EB%94%94%EC%9E%90%EC%9D%B8");
});
test("unavailable detail offers no entrance", async () => {
  mockDetail.mockRejectedValue(new Error("현재 관람할 수 없는 전시예요."));
  mount(<ExhibitionDetail />, "/exhibitions/closed", "/exhibitions/:code");
  expect(await screen.findByRole("alert")).toHaveTextContent("현재 관람할 수 없는 전시예요.");
  expect(screen.queryByRole("link",{name:"전시 입장하기 ↗"})).not.toBeInTheDocument();
});
test("ordinary users cannot access the curation form", async () => {
  (api.getCurationAccess as jest.Mock).mockRejectedValue(new Error("운영자만 전시 노출을 관리할 수 있어요."));
  mount(<ExhibitionAdmin />);
  expect(await screen.findByRole("alert")).toHaveTextContent("운영자만");
  expect(screen.queryByRole("button",{name:"노출 설정 저장"})).not.toBeInTheDocument();
  expect(api.getCuratedGallery).not.toHaveBeenCalled();
});
test("admin saves category, parsed tags and recommendation setting", async () => {
  (api.getCurationAccess as jest.Mock).mockResolvedValue({isPlatformAdmin:true});
  (api.getCuratedGallery as jest.Mock).mockResolvedValue({gallery:item});
  (api.saveCuration as jest.Mock).mockResolvedValue({success:true});
  mount(<ExhibitionAdmin />, "/admin/exhibitions?code=test-code");
  const save = await screen.findByRole("button",{name:"노출 설정 저장"});
  fireEvent.click(screen.getByLabelText("홈 메인 추천에 노출"));
  fireEvent.click(save);
  await waitFor(() => expect(api.saveCuration).toHaveBeenCalledWith("test-code",expect.objectContaining({category:"brand",tags:["디자인"],featured:true})));
  expect(await screen.findByRole("status")).toHaveTextContent("저장했어요");
});
