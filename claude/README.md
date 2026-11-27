# 영상 자료화 — Claude Code 플러그인

이 폴더는 Codex 플러그인과 별개인 **Claude Code 전용 버전**입니다. 저장소 루트의 Codex 파일은 사용하지 않습니다.

## 설치

Claude Code에서 (장면 분석용 분석기 플러그인도 함께 설치):

```
/plugin install video-timestamp-analyzer --marketplace tlatndms2-droid/video-timestamp-analyzer
/plugin install video-tutorial --marketplace tlatndms2-droid/video-tutorial
```

필요 프로그램: Windows 10/11, Node.js 22+, FFmpeg·FFprobe (`winget install Gyan.FFmpeg`), yt-dlp (`winget install yt-dlp.yt-dlp`), Windows PowerShell + 맑은 고딕.
PATH에 없으면 `VIDEO_TUTORIAL_FFMPEG`, `VIDEO_TUTORIAL_FFPROBE`, `VIDEO_TUTORIAL_YT_DLP` 환경 변수로 경로 지정.

## 사용 예

> 이 영상으로 한국어 튜토리얼 만들어 줘. 1080p로, 설명마다 자막 클립·강조 캡처·필요한 움짤 넣어서 secondbrain Vault에 저장해 줘.

## 개발

`npm install` → `npm run build` 로 `dist/server.cjs`, `dist/annotate.ps1` 재생성. 작업 임시 폴더: `%LOCALAPPDATA%\Claude\VideoTutorial\jobs`.
