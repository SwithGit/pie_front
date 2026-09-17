import { trackEntry } from "../../api/exhibitionBusiness";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { GallerySession, openPublicGallery, PublicGallery } from "../../api/publicGalleries";
import "./viewer.css";

type UnityInstance = { SendMessage: (object: string, method: string, value: string) => void; Quit: () => Promise<void> };
type UnityFactory = (canvas: HTMLCanvasElement, config: Record<string, unknown>, progress: (n: number) => void) => Promise<UnityInstance>;
type BridgeEvent = { type: string; dropId?: string; message?: string };
const buildBase = (process.env.REACT_APP_UNITY_BASE_URL || (process.env.NODE_ENV === "development" ? "http://127.0.0.1:5177" : "")).replace(/\/$/, "");
const buildName = process.env.REACT_APP_UNITY_BUILD_NAME || "WebBuild";
const buildVersion = process.env.REACT_APP_UNITY_BUILD_VERSION || "1";
const buildUrl = (suffix: string) => `${buildBase}/Build/${buildName}.${suffix}?v=${encodeURIComponent(buildVersion)}`;

function UnityCanvas({ session, onEvent, onError }: { session: GallerySession; onEvent: (event: BridgeEvent) => void; onError: (message: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [progress, setProgress] = useState(0);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let disposed = false;
    let instance: UnityInstance | undefined;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const receive = (raw: Event) => {
      const event = (raw as CustomEvent<BridgeEvent>).detail;
      if (!disposed && event && event.dropId === session.dropId) onEvent(event);
    };
    window.addEventListener("dr-unity-event", receive);
    const script = document.createElement("script");
    script.src = buildUrl("loader.js"); script.async = true;
    script.onload = async () => {
      if (disposed) return;
      const factory = (window as Window & { createUnityInstance?: UnityFactory }).createUnityInstance;
      if (!factory) { onError("관람 프로그램을 시작하지 못했어요. 페이지를 새로고침해 주세요."); return; }
      try {
        const created = await factory(canvas, {
          dataUrl: buildUrl("data.unityweb"), frameworkUrl: buildUrl("framework.js.unityweb"), codeUrl: buildUrl("wasm.unityweb"),
          streamingAssetsUrl: `${buildBase}/StreamingAssets`, companyName: "SwithFactory", productName: "Vrinart", productVersion: buildVersion,
          showBanner: (message: string, type: string) => { if (!disposed && type === "error") onError(message); },
        }, n => { if (!disposed) setProgress(n); });
        if (disposed) { await created.Quit(); return; }
        instance = created; setLoaded(true);
        created.SendMessage("DRBridge", "InitializeSession", JSON.stringify(session));
      } catch (e) { if (!disposed) onError(e instanceof Error ? e.message : String(e)); }
    };
    script.onerror = () => { if (!disposed) onError("관람 파일을 받지 못했어요. 잠시 후 새로고침해 주세요."); };
    document.body.appendChild(script);
    return () => { disposed = true; window.removeEventListener("dr-unity-event", receive); script.remove(); void instance?.Quit().catch(() => undefined); };
  }, [session, onEvent, onError]);
  return <><canvas id="vrinart-unity-canvas" ref={canvasRef} className="vrinart-canvas" tabIndex={0} aria-label="3D 전시 관람 화면" />
    {!loaded && <div className="vrinart-loading"><span>VRINART</span><h2>전시 공간을 준비하고 있어요</h2><progress value={progress} max={1} /><p>{Math.round(progress * 100)}% · 처음 입장할 때는 잠시 시간이 걸릴 수 있어요.</p></div>}</>;
}

export default function Content({ code }: { code: string }) {
  const [session, setSession] = useState<GallerySession | null>(null);
  const [gallery, setGallery] = useState<PublicGallery | null>(null);
  const [status, setStatus] = useState("전시 정보를 확인하고 있어요");
  const [error, setError] = useState("");
  const failed = useRef(false);
  const onError = useCallback((message: string) => { failed.current = true; setError(message); }, []);
  const onEvent = useCallback((event: BridgeEvent) => {
    if (event.type === "error") { onError(event.message || "전시를 불러오지 못했어요."); return; }
    if (failed.current) return;
    if (event.type === "room_entered") setStatus("관람 중");
    else if (event.type === "room_loading") setStatus("작품과 공간을 불러오고 있어요");
    else if (event.type === "session_received") setStatus("전시 입장을 준비하고 있어요");
  }, [onError]);
  useEffect(() => {
    const controller = new AbortController();
    failed.current = false;
    if (!buildBase) { onError("관람 서비스 준비 중이에요. 잠시 후 다시 방문해 주세요."); return; }
    if (!/^[A-Za-z0-9_-]{1,45}$/.test(code)) { onError("전시 주소가 올바르지 않아요."); return; }
    openPublicGallery(code, controller.signal).then(data => {
      if (controller.signal.aborted) return;
      setGallery(data.gallery); setSession(data.session);
      void trackEntry(code).catch(() => undefined); document.title = `${data.gallery.title} · VRINART`;
    }).catch(e => { if (!controller.signal.aborted) onError(e.message); });
    return () => { controller.abort(); document.title = "뚝딱"; };
  }, [code, onError]);
  return <div className="vrinart-viewer">
    <header className="vrinart-viewer-header"><strong>{gallery?.title || "VRINART"}</strong><span aria-live="polite">{error ? "입장하지 못했어요" : status}</span></header>
    <div className="vrinart-stage">
      {session && <UnityCanvas session={session} onEvent={onEvent} onError={onError} />}
      {!session && !error && <div className="vrinart-loading"><h2>전시 정보를 확인하고 있어요</h2></div>}
      {error && <div className="vrinart-error" role="alert"><h1>전시에 입장하지 못했어요</h1><p>{error}</p><div><button onClick={() => window.location.reload()}>다시 시도</button><a href="/galleries">전시 목록 보기</a></div></div>}
    </div>
  </div>;
}
