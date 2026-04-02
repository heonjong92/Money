<!-- [Codex] Node 없이 바로 실행 가능한 개인용 PWA 구조와 iPhone 사용 절차를 간단히 정리했습니다. -->
# Money Pocket

아이폰에서 홈 화면에 추가해 사용할 수 있도록 만든 개인용 가계부 PWA입니다. 서버나 회원가입 없이 브라우저 `localStorage`에 거래와 월 예산을 저장합니다.

## 포함 기능

- 지출/수입 빠른 기록
- 월별 요약 카드와 예산 소진률
- 카테고리별 지출 분석
- 거래 수정/삭제와 검색 필터
- JSON 백업/복원
- 서비스 워커 기반 오프라인 캐시

## 실행 방법

1. 작업 폴더에서 아래 명령으로 정적 서버를 실행합니다.

```powershell
python -m http.server 4173
```

2. PC 브라우저에서 `http://localhost:4173`으로 접속합니다.
3. 아이폰에서 같은 네트워크에 연결한 뒤, PC의 로컬 IP로 접속합니다.
4. iPhone Safari 공유 메뉴에서 `홈 화면에 추가`를 선택합니다.

## GitHub Pages 배포

<!-- [Codex] GitHub Pages에서는 저장소 루트 전체를 노출하지 않고 앱 실행에 필요한 정적 파일만 배포하도록 워크플로를 함께 둡니다. -->
1. GitHub에 새 저장소를 만들고 현재 폴더 내용을 올립니다.
2. 기본 브랜치를 `main` 또는 `master`로 맞춥니다.
3. 저장소의 `Settings > Pages > Build and deployment`에서 `Source`를 `GitHub Actions`로 선택합니다.
4. 이 프로젝트에 포함된 `.github/workflows/deploy-pages.yml` 워크플로가 실행되면 정적 파일만 GitHub Pages로 배포됩니다.
5. 배포 주소는 보통 `https://<github-id>.github.io/<repo-name>/` 형식입니다.

<!-- [Codex] GitHub Pages 프로젝트 사이트는 저장소 하위 경로에서 열리므로 첫 배포 후 실제 주소로 PWA 설치와 서비스 워커 갱신을 확인하는 흐름을 남깁니다. -->
6. 첫 배포 후 iPhone Safari에서 실제 Pages 주소를 열고 홈 화면에 추가하면, PC를 꺼도 계속 접속할 수 있습니다.

## 주의 사항

- 데이터는 현재 브라우저에만 저장됩니다.
- 다른 기기와 자동 동기화는 없습니다.
- 브라우저 데이터를 지우기 전에 `JSON 내보내기`로 백업하는 것이 안전합니다.
