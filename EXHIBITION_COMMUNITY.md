# 팝업·전시 2차 기능

기존 흰색 배경·짙은 글자·앰버 포인트를 유지한다. 제품소개(`/product`)와 다운로드 디자인은 유지한다.

## 화면

- 전시 상세: 찜하기, 웹 좋아요, 제작자 프로필 링크, 신고 폼, 관련 전시.
- `/mypage/exhibitions`: 찜한 전시 / 최근 본 전시 / 좋아요한 전시. 홈 바로가기와 마이페이지 메뉴에서 접근.
- `/creators/:nickname`: 공개 제작자·브랜드 프로필과 현재 관람 가능한 전시.
- `/mypage/creator`: 공개 표시 이름·소개·이미지 주소·웹사이트 편집. 업로드 기능이 아닌 HTTPS 이미지 주소 입력.
- `/mypage/publications`: 본인이 발행한 전시 심사 상태·반려 사유·재심사 요청.
- `/admin/moderation`: 제목·소개·대표 이미지 공개 심사, 신고 접수 목록과 조치. `/admin/exhibitions` 홈 노출 관리에서 연결.
- 일반/구글/카카오 로그인 후 기존 전시 상세·보관함·프로필·심사 화면으로 돌아온다. 허용된 내부 경로만 복귀 가능하다.

새 전시와 승인 후 내용이 변경된 전시는 승인 전 홈페이지/공개 관람에 노출되지 않는다. 006 최초 적용 전에 이미 공개된 전시는 자동 승인으로 등록해 유지한다. 신규 심사 정책은 제작자에게 안내해야 한다. 운영자용 미승인 공간 내부 3D 미리보기는 이번 화면에 포함하지 않는다.

## 서버 적용

**백엔드 SQL `006_exhibition_community.sql` → 백엔드 배포 → 프론트 배포** 순서. 005가 먼저 적용되어 있어야 한다. 테이블은 6개가 추가된다. 환경 변수는 기존 값을 유지하며 프론트에 JWT 비밀키를 넣지 않는다. 상세 SQL/API/집계/심사 규칙은 백엔드 `EXHIBITION_COMMUNITY.md` 참조.

웹 좋아요는 Unity 기존 Like와 별도이며, 인기순은 기존 조회 + 웹 방문 누계 + 웹 좋아요 × 5다. 상세 방문은 같은 사용자/익명 브라우저에서 전시별 하루 1회 집계한다. 최근 본 기록은 로그인 계정만 저장한다. 끝난 전시/비공개/심사 미승인은 보관함에서도 숨긴다.

## 로컬 확인

`node node_modules/typescript/bin/tsc --noEmit --incremental false`

`node node_modules/react-scripts/scripts/test.js --watchAll=false --runInBand --runTestsByPath src/pages/Exhibitions/Community.test.tsx src/pages/Exhibitions/Discovery.test.tsx src/utils/safeLoginNext.test.ts src/pages/account/CompleteProfile.test.tsx`

타입 검사 및 테스트 20개 통과. 기존 React 테스트 도구/CRA 의존성 경고는 남아 있다. 프로덕션 빌드는 실행하지 않았다. 화면 검증용 API/계정은 임시 로컬 데이터였으며 운영 DB는 수정하지 않았다.
