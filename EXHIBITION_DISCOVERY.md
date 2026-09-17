# 팝업·전시 탐색 홈

> 2차 기능 적용 버전입니다. 현재 배포는 005 → 006 SQL → 백엔드 → 프론트 순서입니다. 심사·집계·보관함의 최신 규칙은 [EXHIBITION_COMMUNITY.md](EXHIBITION_COMMUNITY.md)를 확인하세요.

홈 `/`을 공개 팝업·전시 탐색 화면으로 변경하고, 기존 홈을 `/product`에 보존했습니다. 기존 제품소개·다운로드의 흰 배경, 짙은 글자, 앰버 `#fab92c`, 넓은 여백, 둥근 이미지 스타일을 이어갑니다.

## 연결 페이지

- `/`: 운영자 추천 메인, 카테고리, 인기·신규·종료 임박, 제작 안내
- `/galleries`: 카테고리/태그/검색/정렬 필터와 목록
- `/exhibitions/:code`: 상세 소개, 관람 기간, WebGL 입장, 공유
- `/admin/exhibitions`: 운영자 노출 관리. 작업 공간의 운영자 링크로 접근
- `/product`: 기존 홈
- `/share/:code`: SNS용 서버 HTML 프록시. 로컬 개발에서는 상세 페이지로 이동

## 반드시 백엔드부터 배포

1. 백엔드 `migrations/005_exhibition_discovery.sql` 적용
2. 백엔드 새 API 배포
3. 프론트 배포 (`vercel.json` 포함)
4. 운영자 화면에서 분류·태그·추천·공유 대표 이미지 지정

환경 변수 `REACT_APP_API_BASE_URL`은 기존 설정을 유지합니다. `/share/:code`의 프록시는 현재 `https://www.pieback.com`을 가리키므로 백엔드 도메인 변경 시 `vercel.json`도 수정해야 합니다.

공유 버튼의 `/share/:code` 링크가 SNS 미리보기용 주소입니다. 서버가 OG 제목·설명·이미지를 제공한 뒤 사람은 상세 페이지로 이동합니다. `/exhibitions/:code` 자체는 SPA 상세 페이지입니다.

현재 누적 조회수를 사용하는 목록은 ‘많이 본 순’으로 표시합니다. 4개 이하의 공개 전시는 중복 섹션을 축약하며, 추천이 없어도 최신 전시로 메인 영역이 채워집니다. 임의의 인기 수치나 가짜 전시는 프로덕션에 넣지 않았습니다.

검사: `node node_modules/typescript/bin/tsc --noEmit --incremental false`, `npm test -- --watchAll=false --runInBand --runTestsByPath src/pages/Exhibitions/Discovery.test.tsx`.

이번 작업에서는 프로덕션 빌드, Git 커밋/푸시, 운영 DB 변경, 배포를 하지 않았습니다.
