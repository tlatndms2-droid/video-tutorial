# 영상 자료화

YouTube 영상이나 보유한 영상 파일로 한국어 Obsidian 튜토리얼을 만드는 로컬 플러그인입니다. **Codex**와 **Claude Code** 두 곳에서 쓸 수 있도록 버전을 따로 제공합니다.

| | Codex 버전 | Claude Code 버전 |
|---|---|---|
| 위치 | 저장소 루트 (`src/`, `dist/`, `skills/`, `mcp.json`) | `claude/` 폴더 |
| 버전 | `0.1.0` | `0.1.1` |
| 함께 쓰는 분석기 | Codex용 영상 타임스탬프 분석기 | Claude Code용 [video-timestamp-analyzer](https://github.com/tlatndms2-droid/video-timestamp-analyzer) |
| 작업 임시 폴더 | `%LOCALAPPDATA%\Codex\VideoTutorial\jobs` | `%LOCALAPPDATA%\Claude\VideoTutorial\jobs` |

두 버전은 서로의 파일을 사용하지 않습니다. 한쪽을 고쳐도 다른 쪽에는 영향이 없습니다.

## 사용 흐름

1. 영상 자료화와 영상 타임스탬프 분석기를 함께 연결합니다.
2. 영상 주소 또는 MP4와 SRT 파일을 제공하고 원하는 화질, 분석 양식, 결과 Vault를 지정합니다.
3. AI(Codex 또는 Claude)가 영상 타임스탬프 분석기 지침에 따라 자막과 화면을 분석하고, 절별 장면과 원본 시각을 정합니다.
4. 플러그인이 절에 맞는 클립을 자르고 한국어 자막을 입힙니다. 캡처에는 확대·화살표·원·설명을 넣고, 필요한 움직임은 GIF로 만듭니다.
5. 한국어 자막 클립 → 설명과 주석 캡처 → 필요한 GIF 순서의 Markdown 자료를 Obsidian Vault의 새 폴더에 저장합니다.

사용 예시

> 이 영상으로 상세한 한국어 튜토리얼을 만들어줘. 화질은 1080p로 하고 각 설명에 맞춰 짧은 자막 영상, 강조 캡처, 필요한 움짤을 만든 다음 secondbrain Vault에 저장해줘.

## 설치

Obsidian 커뮤니티 플러그인이 아닙니다. **Codex** 또는 **Claude Code**용 로컬 플러그인입니다.

### Codex

1. GitHub Releases에서 video-tutorial-0.1.0.zip을 받아 원하는 폴더에 풉니다.
2. Codex의 플러그인 디렉터리에서 로컬 마켓플레이스에 압축 해제한 폴더를 등록하고 영상 자료화를 설치·활성화합니다.
3. Codex에서 영상 자료화와 영상 타임스탬프 분석기를 사용할 수 있는 새 작업을 엽니다.
4. @영상 자료화를 선택해 영상 주소와 원하는 출력 조건을 요청합니다.

### Claude Code

1. 아래 필요 환경을 설치합니다.
2. Claude Code에서 분석기와 영상 자료화를 함께 설치합니다.

   ```
   /plugin install video-timestamp-analyzer --marketplace tlatndms2-droid/video-timestamp-analyzer
   /plugin install video-tutorial --marketplace tlatndms2-droid/video-tutorial
   ```

3. Claude 앱(또는 Claude Code)을 다시 시작한 뒤 새 대화에서 "이 영상으로 튜토리얼 만들어 줘"처럼 요청합니다.

Node.js를 막 설치했다면 Claude 앱을 완전히 껐다 켜야 합니다. 그래야 MCP 서버가 Node를 찾을 수 있습니다.

## 필요 환경

- Windows 10/11
- Node.js 22 이상 (`winget install OpenJS.NodeJS.LTS`)
- FFmpeg와 FFprobe (`winget install Gyan.FFmpeg`)
- YouTube 영상 다운로드용 yt-dlp (`winget install yt-dlp.yt-dlp`)
- 이미지 주석용 Windows PowerShell과 맑은 고딕
- 대상 Obsidian Vault의 경로

FFmpeg·FFprobe·yt-dlp가 PATH에 없으면 `VIDEO_TUTORIAL_FFMPEG`, `VIDEO_TUTORIAL_FFPROBE`, `VIDEO_TUTORIAL_YT_DLP` 환경 변수에 각각 실행 파일의 절대 경로를 설정할 수 있습니다. Claude Code 버전은 WinGet으로 설치한 yt-dlp도 자동으로 찾습니다.

## 제공 기능

YouTube 해상도 및 자막 조회, 선택한 해상도 다운로드, 로컬 MP4/SRT 가져오기, 원본 자막 읽기, 한국어 자막 클립 만들기, 프레임 캡처와 주석·두 장 비교, 짧은 GIF 만들기, Markdown 조립과 Obsidian Vault 저장을 제공합니다.

한국어 번역과 장면 선택은 AI가 영상 타임스탬프 분석기 지침을 적용해 수행합니다. 이 분석기가 같은 작업(대화)에 연결되어 있어야 합니다. 원본 영상 접근 및 자막 제공 여부에 따라 다운로드 가능한 화질과 자막 종류가 달라집니다.

## 개발

- **Codex 버전**: 저장소 루트에서 `npm install`, `npm run build`를 실행하면 `dist/server.cjs`와 `dist/annotate.ps1`을 다시 만듭니다.
- **Claude Code 버전**: `claude/` 폴더에서 같은 명령을 실행합니다.
- 두 버전 모두 Node.js 22 이상이 필요합니다. MCP 도구 이름과 입력 형식은 각 버전의 `src/server.mjs`를 확인하세요.

## 라이선스와 미디어

소스는 LICENSE의 MIT 조건으로 공개합니다. 영상과 자막의 접근권 및 이용 권리는 사용자가 별도로 확인해야 합니다.
