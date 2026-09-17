# 3단계 사용 안내

기존 흰색 배경·짙은 글자·앰버 포인트를 유지했다. 제품소개와 다운로드 화면은 그대로다.

- `/mypage/business`: 본인 전시 선택 → 최근 7/30/90일 통계, 일별 그래프/표/CSV. 상품·예약·쿠폰 외부 연결 등록과 수정.
- `/admin/business`: 프로모션 광고, 운영자가 설정하는 문의형 요금제, 외부 연결 승인/반려.
- `/pricing`: 공개 요금제·금액·구성 및 도입 문의. 미등록 상태는 맞춤 문의 안내. 0원과 ‘별도 협의’를 구분한다.
- `/cs?plan=요금제이름`: 기존 문의 폼에 요금제와 도입 문의 내용 자동 입력. 직접 제출해야 문의가 접수된다.
- 홈: 유효한 광고가 있을 때만 Sponsored 영역. 전시 비공개/미승인/기간 종료 및 광고 기간 밖에는 숨김.
- 전시 상세: 승인된 상품·예약 버튼, 공통 쿠폰 코드 확인·복사. 외부 사용처에서 구매·예약·쿠폰 사용을 진행한다.

요금제는 **소개·도입 문의 방식**이다. 실제 결제/정기 구독/요금제별 권한 제한을 자동 적용하지 않는다. 상품 클릭은 구매 완료, 예약 클릭은 예약 확정, 쿠폰 확인은 실제 사용 완료를 의미하지 않는다. 그래프에는 실제 수집한 기록만 표시한다. 신규 이벤트는 3단계 배포 후부터 쌓인다.

## 배포

기존 005/006 적용 후 백엔드의 **007_exhibition_business.sql → 백엔드 → 프론트** 순서다. 새 테이블 4개만 추가한다. 임의 가격이나 광고 데이터를 등록하지 않았다. 추가 API 키는 없으며 기존 API 주소 환경 변수를 유지한다. 운영자 ID 목록은 기존 서버 설정을 사용한다.

자세한 API, SQL 확인 쿼리, 집계 기준과 운영 방법은 백엔드 `EXHIBITION_BUSINESS.md`를 확인한다. 실제 운영 DB와 외부 예약·구매 서비스까지의 통합 테스트는 별도다.

## 검증

TypeScript 검사와 프론트 테스트 30개 통과. 로컬 fixture API로 데스크톱·모바일 화면과 등록/심사/쿠폰/문의 흐름 확인. 기존 React 테스트 도구 및 CRA 의존성 경고가 남아 있다. 프로덕션 빌드, 커밋/푸시, 운영 배포는 수행하지 않았다.

```text
node node_modules/typescript/bin/tsc --noEmit --incremental false
node node_modules/react-scripts/scripts/test.js --watchAll=false --runInBand --runTestsByPath src/pages/Exhibitions/Business.test.tsx src/pages/Exhibitions/Community.test.tsx src/pages/Exhibitions/Discovery.test.tsx src/utils/safeLoginNext.test.ts src/pages/account/CompleteProfile.test.tsx
```
