# 영상 자료화

YouTube 영상이나 보유한 영상 파일로 한국어 Obsidian 튜토리얼을 만드는 Codex 로컬 플러그인입니다.

## 사용 흐름

1. Codex에서 영상 자료화와 영상 타임스탬프 분석기를 연결합니다.
2. 영상 주소 또는 MP4와 SRT 파일을 제공하고 원하는 화질, 분석 양식, 결과 Vault를 지정합니다.
3. Codex가 영상 타임스탬프 분석기 지침에 따라 자막과 화면을 분석하고 절별 장면·원본 시각을 정합니다.
4. 플러그인이 절에 맞는 클립을 자르고 한국어 자막을 입힙니다. 캡처에 확대·화살표·원·설명을 넣고 필요한 움직임은 GIF로 만듭니다.
5. 한국어 자막 클립 → 설명과 주석 캡처 → 필요한 GIF 순서의 Markdown 자료를 Obsidian Vault의 새 폴더에 저장합니다.

사용 예시

> 이 영상으로 상세한 한국어 튜토리얼을 만들어줘. 화질은 1080p로 하고 각 설명에 맞춰 짧은 자막 영상, 강조 캡처, 필요한 움짤을 만든 다음 secondbrain Vault에 저장해줘.

## 설치

이것은 Obsidian 커뮤니티 플러그인이 아니라 **Codex Windows 로컬 플러그인**입니다.

1. GitHub Releases에서 video-tutorial-0.1.0.zip을 받아 원하는 폴더에 풉니다.
2. Codex의 플러그인 디렉터리에서 로컬 마켓플레이스에 압축 해제한 폴더를 등록하고 영상 자료화를 설치·활성화합니다.
3. Codex에서 영상 자료화와 영상 타임스탬프 분석기를 사용할 수 있는 새 작업을 엽니다.
4. @영상 자료화를 선택해 영상 주소와 원하는 출력 조건을 요청합니다.

## 필요 환경

- Windows 10/11, Node.js 22 이상
- FFmpeg와 FFprobe
- YouTube 영상 다운로드용 yt-dlp
- 이미지 주석용 Windows PowerShell과 맑은 고딕
- 대상 Obsidian Vault의 경로

FFmpeg·FFprobe·yt-dlp가 PATH에 없으면 VIDEO_TUTORIAL_FFMPEG, VIDEO_TUTORIAL_FFPROBE, VIDEO_TUTORIAL_YT_DLP 환경 변수에 각각 실행 파일의 절대 경로를 설정할 수 있습니다.

## 제공 기능

YouTube 해상도 및 자막 조회, 선택한 해상도 다운로드, 로컬 MP4/SRT 가져오기, 원본 자막 읽기, 한국어 자막 클립 만들기, 프레임 캡처와 주석·두 장 비교, 짧은 GIF 만들기, Markdown 조립과 Obsidian Vault 저장을 제공합니다.

한국어 번역과 장면 선택은 Codex가 영상 타임스탬프 분석기 지침을 적용해 수행합니다. 이 분석기는 같은 Codex 작업에서 연결되어 있어야 합니다. 원본 영상 접근 및 자막 제공 여부에 따라 다운로드 가능한 화질과 자막 종류가 달라집니다.

## 개발

이 폴더에서 npm install, npm run build를 실행하면 dist/server.cjs와 dist/annotate.ps1을 다시 만듭니다. Node.js 22 이상이 필요합니다. MCP 도구 이름과 입력 형식은 src/server.mjs를 확인하세요.

## 라이선스와 미디어

소스는 LICENSE의 MIT 조건으로 공개합니다. 영상과 자막의 접근권 및 이용 권리는 사용자가 별도로 확인해야 합니다.
