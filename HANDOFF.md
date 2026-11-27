# HANDOFF

## 프로젝트

영상 자료화는 Windows용 Codex 로컬 MCP 플러그인입니다. Obsidian 플러그인 main.js는 포함하지 않습니다. 결과를 지정한 Obsidian Vault에 Markdown과 첨부 파일로 저장합니다.

Codex는 영상 타임스탬프 분석기 지침을 사용해 절별 설명과 원본 구간을 결정합니다. 이 플러그인은 자막 클립, 캡처, 이미지 주석, GIF, 문서 패키징, Vault 복사를 담당합니다. 사용 전에 두 플러그인이 같은 Codex 작업에서 연결돼 있는지 확인합니다.

## 버전 및 릴리스

플러그인 버전과 Git 태그는 0.1.0으로 맞춥니다. 릴리스 zip은 소스와 dist 실행 파일, README, HANDOFF를 포함합니다. 사용자 영상, SRT, 개인 토큰, 작업 임시 폴더는 저장소와 릴리스에서 제외합니다.

## 코드 위치

- src/server.mjs: MCP 도구 등록과 입력 검증
- src/runtime.mjs: 로컬 도구 검색, YouTube 조회·다운로드, 작업 폴더
- src/subtitles.mjs: SRT 파싱, 클립 시각에 맞춘 자막 범위 변환
- src/media.mjs: FFmpeg 클립·캡처·GIF 생성
- src/annotate.ps1: 캡처 주석 렌더링
- src/tutorial.mjs: Markdown 패키징 및 Vault 저장
- skills/video-tutorial/SKILL.md: 분석기 지침을 적용하는 작업 흐름
- dist/server.cjs: 실행 서버 번들

## 다시 빌드하고 검증하기

Windows와 Node.js 22 이상에서 npm install, npm run build를 실행합니다. 다음으로 dist/server.cjs 구문을 확인하고 check_dependencies 도구를 호출합니다. 실제 영상 검증은 이용 권한이 있는 짧은 영상과 SRT로 수행합니다. 선택 화질, 원본 자막 타임코드, 자막이 입혀진 클립, 주석 이미지, GIF, Obsidian Vault 결과 파일을 확인합니다.

검증하지 않은 기능은 완료로 표시하지 않습니다. 새 배포 전 태그와 plugin.json, 설치본 버전을 확인하고, 릴리스 zip을 만든 뒤 압축 안의 파일을 다시 열어 확인합니다.

## 파일 및 데이터 경계

YouTube URL은 HTTPS의 YouTube 도메인만 허용합니다. Vault 저장은 사용자가 지정한 절대 경로 안의 새 폴더에만 기록합니다. 같은 이름의 폴더가 있으면 실패 처리합니다. 기존 사용자 자료와 작업 임시 폴더는 자동 삭제하지 않습니다.
