# HANDOFF

## 프로젝트

영상 자료화는 Windows용 로컬 MCP 플러그인입니다. Obsidian 플러그인 main.js는 포함하지 않습니다. 결과를 지정한 Obsidian Vault에 Markdown과 첨부 파일로 저장합니다.

AI는 영상 타임스탬프 분석기 지침을 사용해 절별 설명과 원본 구간을 결정합니다. 이 플러그인은 자막 클립, 캡처, 이미지 주석, GIF, 문서 패키징, Vault 복사를 담당합니다. 사용 전에 두 플러그인이 같은 작업(대화)에 연결돼 있는지 확인합니다.

같은 저장소에 두 버전이 있습니다.

- **Codex 버전**: 저장소 루트. Codex용 영상 타임스탬프 분석기와 함께 씁니다.
- **Claude Code 버전**: `claude/` 폴더. 루트의 소스를 복사해 Claude Code에 맞게 고쳤고, Claude Code용 [video-timestamp-analyzer](https://github.com/tlatndms2-droid/video-timestamp-analyzer) 플러그인과 함께 씁니다.

두 버전은 서로의 파일을 읽지 않습니다. 한쪽을 고칠 때 다른 쪽 동작이 바뀌지 않도록 일부러 분리했습니다.

## 버전 및 릴리스

- **Codex 버전**: 플러그인 버전과 Git 태그를 0.1.0으로 맞춥니다. 릴리스 zip에는 소스, dist 실행 파일, README, HANDOFF를 넣습니다.
- **Claude Code 버전**: `claude/.claude-plugin/plugin.json`과 `.claude-plugin/marketplace.json`의 버전을 맞춥니다. 사용자는 GitHub 저장소에서 `/plugin install`로 설치하므로 zip 릴리스가 필요 없습니다. 대신 `claude/dist/`를 반드시 커밋합니다.
- 사용자 영상, SRT, 개인 토큰, 작업 임시 폴더, `node_modules`는 저장소와 릴리스에서 제외합니다.

## 코드 위치

Codex 버전은 루트, Claude Code 버전은 `claude/` 아래에 같은 구조로 있습니다.

| 파일 | 역할 |
|---|---|
| `src/server.mjs` | MCP 도구 등록과 입력 검증 |
| `src/runtime.mjs` | 로컬 도구 검색, YouTube 조회·다운로드, 작업 폴더 |
| `src/subtitles.mjs` | SRT 파싱, 클립 시각에 맞춘 자막 범위 변환 |
| `src/media.mjs` | FFmpeg 클립·캡처·GIF 생성 |
| `src/annotate.ps1` | 캡처 주석 렌더링 |
| `src/tutorial.mjs` | Markdown 패키징 및 Vault 저장 |
| `skills/video-tutorial/SKILL.md` | 분석기 지침을 적용하는 작업 흐름 |
| `dist/server.cjs` | 실행 서버 번들 |

버전별 실행 설정은 다음과 같습니다.

- Codex: `mcp.json`, `plugin.json`
- Claude Code: `claude/.mcp.json` (`node ${CLAUDE_PLUGIN_ROOT}/dist/server.cjs`), `claude/.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`

## Claude Code 버전에서 달라진 점

- 작업 임시 폴더가 `%LOCALAPPDATA%\Codex\VideoTutorial\jobs`에서 `%LOCALAPPDATA%\Claude\VideoTutorial\jobs`로 바뀌었습니다.
- yt-dlp를 찾을 때 WinGet 설치 위치(`WinGet\Links`, `WinGet\Packages\yt-dlp.yt-dlp*`)도 확인합니다.
- 노트의 원본 시각 링크가 분석기와 같은 형식 `&t=총초#t=표시시간`을 씁니다.
- SKILL.md는 Codex 플러그인 링크 대신 Claude Code의 video-timestamp-analyzer 스킬을 불러오도록 바뀌었습니다.
- MCP 서버는 PATH의 `node`로 실행됩니다. Node.js를 새로 설치했다면 Claude 앱을 다시 시작해야 연결됩니다.

## 다시 빌드하고 검증하기

1. 고칠 버전의 폴더(루트 또는 `claude/`)에서 작업합니다. Windows와 Node.js 22 이상이 필요합니다.
2. `npm install`, `npm run build`를 실행합니다.
3. `node --check dist/server.cjs`로 구문을 확인하고, `check_dependencies` 도구를 호출합니다.
4. Claude Code 버전은 `claude plugin validate .`로 플러그인 구성도 검사합니다.
5. 실제 영상 검증은 이용 권한이 있는 짧은 영상과 SRT로 합니다. 다음을 확인합니다.
   - 선택 화질
   - 원본 자막 타임코드
   - 자막이 입혀진 클립
   - 주석 이미지, GIF
   - Obsidian Vault 결과 파일

검증하지 않은 기능은 완료로 표시하지 않습니다. 배포 전 버전 표기를 확인합니다. Codex 릴리스 zip은 만든 뒤 압축 안의 파일을 다시 열어 확인합니다.

## 파일 및 데이터 경계

YouTube URL은 HTTPS의 YouTube 도메인만 허용합니다. Vault 저장은 사용자가 지정한 절대 경로 안의 새 폴더에만 기록합니다. 같은 이름의 폴더가 있으면 실패 처리합니다. 기존 사용자 자료와 작업 임시 폴더는 자동 삭제하지 않습니다.
