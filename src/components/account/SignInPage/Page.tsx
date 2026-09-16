import React, { useEffect, useRef, useState } from "react";
import * as S from "./Page.style";
import { useDispatch } from "react-redux";
import { loginSuccess, logout } from "../../../redux/authSlice";
import AccountLogo from "../../../assets/img/Frame 8644.png";
import GoogleLoginImage from "../../../assets/img/btn_google_signin_light_normal_web.png";
import KakaoLoginImage from "../../../assets/img/kakao_login_medium_narrow.png";
import { loginApi } from "../../../api/api";
import { SocialProvider, startSocialLogin } from "../../../api/socialLogin";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

const Page: React.FC = () => {
  const [id, setId] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [socialPending, setSocialPending] = useState<SocialProvider | null>(null);
  const [socialError, setSocialError] = useState("");
  const pending = useRef<ReturnType<typeof startSocialLogin> | null>(null);
  useEffect(() => () => { pending.current?.cancel(); pending.current = null; }, []);

  const handleSocialLogin = async (provider: SocialProvider) => {
    if (pending.current) return;
    setSocialError("");
    setSocialPending(provider);
    let attempt: ReturnType<typeof startSocialLogin> | null = null;
    try {
      attempt = startSocialLogin(provider);
      pending.current = attempt;
      const result = await attempt.result;
      if (pending.current !== attempt) return;
      const next = new URLSearchParams(location.search).get("next") === "/workspaces" ? "/workspaces" : "/";
      if (result.requiresProfile) {
        dispatch(logout());
        sessionStorage.setItem("socialProfileToken", result.token);
        navigate(`/complete-profile?next=${encodeURIComponent(next)}`);
      } else {
        sessionStorage.removeItem("socialProfileToken");
        dispatch(loginSuccess(result));
        navigate(next);
      }
    } catch (error) {
      if (attempt && pending.current !== attempt) return;
      const code = error instanceof Error ? error.message : "login_failed";
      setSocialError(t(code === "popup_blocked" ? "socialPopupBlocked" : code === "popup_closed" || code === "access_denied" ? "socialLoginCancelled" : "socialLoginFailed"));
    } finally {
      if (!attempt || pending.current === attempt) {
        pending.current = null;
        setSocialPending(null);
      }
    }
  };

  const handleLogin = async () => {
    if (!id) {
      alert(t("enterId"));
      return;
    }
    if (!password) {
      alert(t("enterPassword"));
      return;
    }
    try {
      const response = await loginApi(id, password);

      if (response.success) {
        dispatch(
          loginSuccess({
            id: response.id || id,
            token: response.token,
          })
        );
        navigate(new URLSearchParams(location.search).get("next") === "/workspaces" ? "/workspaces" : "/");
      } else {
        switch (response.statusCode) {
          case 400:
            alert(t("incorrectPassword"));
            break;
          case 404:
            alert(t("nonExistentId"));
            break;
          case 500:
            alert(t("serverError"));
            break;
          default:
            alert(response.msg || t("loginFailed"));
            break;
        }
      }
    } catch (error) {
      console.error(t("loginError"), error);
      alert(t("checkInternetConnection"));
    }
  };

  return (
    <>
      <S.Container>
        <S.ProfileContent>
          <S.AccountLogo src={AccountLogo} />
          <S.LoginForm>
            <S.LoginType></S.LoginType>
            <S.LoginInfo>{t("loginExperience")}</S.LoginInfo>
            <S.InputField
              type="text"
              placeholder={t("idPlaceholder")}
              value={id}
              onChange={(e) => setId(e.target.value)}
            />
            <S.InputField
              type="password"
              placeholder={t("passwordPlaceholder")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <S.LoginButton onClick={handleLogin}>
              {t("loginButton")}
            </S.LoginButton>
            <S.Divider>
              <hr />
              {t("or")}
              <hr />
            </S.Divider>
            <S.KakaoLoginButton type="button" disabled={socialPending !== null} aria-label={t(socialPending === "kakao" ? "socialLoginPending" : "loginWithKakao")} aria-busy={socialPending === "kakao"} onClick={() => handleSocialLogin("kakao")}>
              <img src={KakaoLoginImage} alt="" width={183} height={45} />
            </S.KakaoLoginButton>
            <S.GoogleLoginButton type="button" disabled={socialPending !== null} aria-label={t(socialPending === "google" ? "socialLoginPending" : "loginWithGoogle")} aria-busy={socialPending === "google"} onClick={() => handleSocialLogin("google")}>
              <img src={GoogleLoginImage} alt="" />
            </S.GoogleLoginButton>
            {socialError && <S.SocialError role="alert">{socialError}</S.SocialError>}
            <S.Actions>
              <S.ActionLink
                onClick={() => {
                  navigate("/signup");
                }}
              >
                {t("signup")}
              </S.ActionLink>
              <span>|</span>
              <S.ActionLink
                onClick={() => {
                  navigate("/idfind");
                }}
              >
                {t("findId")}
              </S.ActionLink>
              <span>|</span>
              <S.ActionLink
                onClick={() => {
                  navigate("/pwfind");
                }}
              >
                {t("findPassword")}
              </S.ActionLink>
            </S.Actions>
          </S.LoginForm>
        </S.ProfileContent>
      </S.Container>
    </>
  );
};

export default Page;
