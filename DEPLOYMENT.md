# VRINART 전시 목록과 WebGL 배포

## 구성

- 프론트: Vercel + vrinart.com. `/galleries`에서 공개 전시 검색·목록을 표시합니다.
- 백엔드: 기존 pieback.com. 공개 전시 목록과 입장용 DR Bridge 세션을 반환합니다.
- Unity 파일: S3 + CloudFront 권장. `Build/`, `StreamingAssets/`를 같은 버전 폴더에 둡니다.
- 관람자는 카드를 클릭하면 `/ddookddak/{code}`로 이동합니다. 코드를 입력하지 않습니다.
- 기존 홈페이지는 유지하고 상단에 '전시 둘러보기'를 추가했습니다.

## 배포 순서

1. `D:\Backend\pie_back` 변경 사항을 먼저 배포합니다. 기존 운영 방식으로 서버를 재시작하고 `GET https://www.pieback.com/api/public/galleries?page=1&order=latest`가 JSON을 반환하는지 확인합니다. DB 스키마 변경은 없습니다.
2. 현재 Unity 빌드 `E:\PIE\Ddookddak_WebGLVer\WebBuild`의 `Build/`와 `StreamingAssets/`를 CDN의 새 버전 폴더에 업로드합니다. 이번 웹사이트 변경 자체에는 Unity 재빌드가 필요하지 않습니다.
3. Vercel 프로젝트의 환경 변수를 아래와 같이 설정하고 프론트를 배포합니다. 환경 변수 변경 후에도 프론트를 다시 배포해야 합니다.
4. `/galleries`에서 카드를 클릭해 입장하고, 관람 화면 헤더가 '관람 중'으로 바뀌는지 확인합니다. `/ddookddak/{code}` 직접 접속·새로고침도 확인합니다.

## Vercel 설정

Framework: Create React App / Build: `npm run build` / Output: `build`.
`vercel.json`에 SPA 주소의 새로고침 처리를 넣었습니다.

| 변수 | 값 |
|---|---|
| REACT_APP_API_BASE_URL | `https://www.pieback.com` |
| REACT_APP_UNITY_BASE_URL | 실제 CDN의 버전 폴더 URL. `Build` 앞까지 지정 |
| REACT_APP_UNITY_BUILD_NAME | `WebBuild` |
| REACT_APP_UNITY_BUILD_VERSION | 해당 업로드 버전. 예: `20260915-1` |

예를 들어 Unity base가 `https://<실제-CDN>/webgl/20260915-1`이면 그 아래 `Build/WebBuild.loader.js`가 존재해야 합니다. 가상의 CDN 주소를 그대로 입력하지 마세요. 운영 환경에서 base가 비어 있으면 '관람 서비스 준비 중'을 표시합니다. 비밀키는 `REACT_APP_*`에 넣지 않습니다.

Gabia DNS에는 Vercel의 해당 프로젝트 Domains 화면이 제시하는 레코드를 등록합니다. `vrinart.com`과 `www.vrinart.com`을 함께 등록하고 대표 주소를 선택하세요.

## Unity CDN 파일 설정

현재 빌드는 gzip으로 압축된 `.unityweb` 파일을 사용합니다. 파일명을 변경하거나 다시 압축하지 않습니다.

| 파일 | Content-Type | Content-Encoding |
|---|---|---|
| WebBuild.loader.js | application/javascript | 없음 |
| WebBuild.framework.js.unityweb | application/javascript | gzip |
| WebBuild.wasm.unityweb | application/wasm | gzip |
| WebBuild.data.unityweb | application/octet-stream | gzip |

CDN 응답에는 vrinart.com, www.vrinart.com에서의 GET/HEAD를 허용하는 CORS가 필요합니다. 공개 정적 Unity 파일만 제공하는 CDN이라면 `Access-Control-Allow-Origin: *`도 사용할 수 있습니다. S3 원본은 CloudFront를 통해 읽도록 구성하고 자격 증명을 프론트에 넣지 않습니다.

업데이트는 동일 파일을 덮어쓰기보다 새 버전 폴더에 업로드한 뒤 base URL을 변경하는 방식이 권장됩니다. 버전 폴더에는 장기 캐시를 사용할 수 있고, 예전 버전은 롤백용으로 보관합니다. 갤러리 목록·입장 API에는 캐시를 사용하지 않습니다.

CDN은 다운로드와 트래픽 분산을 담당합니다. 브라우저 메모리는 Unity 초기 데이터, 텍스처·모델·동시 로드 에셋을 따로 최적화해야 합니다. 전시 목록에서는 Unity를 실행하지 않고, 입장 화면에서만 하나의 인스턴스를 실행합니다.

## 로컬 확인

프론트 `.env.local`에 API 주소와 Unity base를 넣고 `npm start`를 실행합니다. Unity 파일은 기존 5177 정적 서버로 제공합니다. 운영 API는 백엔드 배포 후 새 경로를 사용할 수 있습니다.

`public/PCUnityBuild`의 기존 Unity 빌드는 새 관람 화면에서 사용하지 않습니다. 기존 파일은 이번 변경에서 삭제하지 않았으므로 Vercel 산출물에는 남아 있습니다.

## 검증 범위

- TypeScript 검사와 웹 빌드 산출물 생성 확인.
- 공개 상태·기간·페이지·입장 재검증 관련 백엔드 단위 검사 6개 통과.
- 브라우저 목록 검사는 운영 DB에서 읽은 공개 메타데이터 2건을 로컬 테스트 API에 연결했습니다. 운영 DB에 새 SQL을 실행하거나 서버를 배포한 검사는 아닙니다.
- 새 관람 화면과 기존 로컬 WebGL 빌드를 연결해 `447f37444ff8439abcab0cd7a1cbff44`의 실제 갤러리 입장과 '관람 중' 전환을 확인했습니다. Unity canvas ID 누락을 수정했습니다. 기존 관람객 캐릭터의 분홍색 재질 문제는 해당 Unity 빌드에 남아 있습니다.
- Git push, 운영 백엔드 배포, S3/CloudFront 생성·업로드, DNS 변경은 수행하지 않았습니다.
