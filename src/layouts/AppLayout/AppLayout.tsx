import {
  Routes,
  Navigate,
  Route,
  useLocation,
  useParams,
  useMatch,
} from "react-router-dom";
import Navbar from "../NavigationBar/Navbar";
import CompleteProfile from "../../pages/account/CompleteProfile";
import SignIn from "../../pages/account/SignIn";
import SignUp from "../../pages/account/SignUp";
import MainContainer from "../../components/MainContainer/MainContainer";
import Footer from "../Footer/Footer";
import Exhibitions from "../../pages/Exhibitions/Exhibitions";
import Content from "../../components/Content/Content";
import IdFind from "../../pages/account/IdFind";
import CustomerService from "../../pages/CustomerService/CustomerService";
import Pwfind from "../../pages/account/PwFind";
import MyPage from "../../pages/Mypage/account";
import ChangePassword from "../../components/mypage/AccountPage/ChangePassword/ChangePassword";
import Withdraw from "../../components/mypage/AccountPage/Withdraw/Withdraw";
import DiscountCoupons from "../../components/mypage/AccountPage/DiscountCoupons/DiscountCoupons";
import Points from "../../pages/Mypage/points";
import Pricing from "../../pages/Pricing/Pricing";
import Download from "../../pages/Download/Download";

import WorkspacePage from "../../pages/Workspace/WorkspacePage";
// GalleryWrapper: URL 파라미터를 받아서 Gallery 컴포넌트에 전달하는 래퍼 컴포넌트
const GalleryWrapper: React.FC = () => {
  const { code } = useParams<{ code: string }>(); // URL의 파라미터에서 'code'를 추출

  return <Navigate replace to={`/ddookddak/${encodeURIComponent(code || "")}`} />; // 'code'가 없으면 빈 문자열 전달
};

// ContentWrapper: URL 파라미터를 받아서 Content 컴포넌트에 전달하는 래퍼 컴포넌트
const ContentWrapper: React.FC = () => {
  const { code } = useParams<{ code: string }>(); // URL의 파라미터에서 'code'를 추출

  return <Content key={code} code={code || ""} />; // 'code'가 없으면 빈 문자열 전달
};

const AppLayout: React.FC = () => {
  const location = useLocation();
  const galleryMatch = useMatch("/gallery/:code");
  const ddookddakMatch = useMatch("/ddookddak/:code");

  const hideFooter =
    location.pathname === "/signin" ||
    location.pathname === "/complete-profile" ||
    location.pathname === "/signup" ||
    location.pathname === "/idfind" ||
    location.pathname === "/pwfind" ||
    ddookddakMatch ||
    galleryMatch ||
    location.pathname === "/";

  const hideNavbar = galleryMatch || ddookddakMatch;

  return (
    <div className="app-layout">
      {!hideNavbar && <Navbar />}
      <main>
        <Routes>
          <Route path="/" element={<MainContainer />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/complete-profile" element={<CompleteProfile />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/workspaces" element={<WorkspacePage />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/download" element={<Download />} />
          <Route path="/cs" element={<CustomerService />} />{" "}
          <Route path="/galleries" element={<Exhibitions />} />
          <Route path="/allgallery/:page/:order" element={<Exhibitions />} />
          <Route path="/gallery/:code" element={<GalleryWrapper />} />{" "}
          <Route path="/ddookddak/:code" element={<ContentWrapper />} />{" "}
          <Route path="/idfind" element={<IdFind />} />
          <Route path="/pwfind" element={<Pwfind />} />
          <Route path="/mypage" element={<MyPage />} />
          <Route path="/mypage/password" element={<ChangePassword />} />
          <Route path="/mypage/points" element={<Points />} />
          <Route path="/mypage/coupons" element={<DiscountCoupons />} />
          <Route path="/mypage/withdraw" element={<Withdraw />} />
        </Routes>
      </main>
      {!hideFooter && <Footer />}
    </div>
  );
};

export default AppLayout;
