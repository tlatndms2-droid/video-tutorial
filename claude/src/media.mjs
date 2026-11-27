import { copyFile, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ffmpeg, getJob, run, videoInfo } from './runtime.mjs';
import { clipSrt } from './subtitles.mjs';

const ffSeconds = ms => (ms / 1000).toFixed(3);

function checkRange(job, start, end, max) {
  if (start >= end || end > Math.ceil(job.duration * 1000) || end - start > max) {
    throw new Error('영상 재생 범위 안에서 유효한 시작·끝을 지정하세요. 최대 길이는 ' + max / 1000 + '초입니다.');
  }
}

export async function makeClip(args, signal) {
  const job = await getJob(args.job_id);
  checkRange(job, args.start_ms, args.end_ms, 300000);
  const subtitle = clipSrt(args.korean_cues, args.start_ms, args.end_ms);
  if (!subtitle || !/[가-힣]/.test(subtitle)) throw new Error('이 구간의 원본 시각에 맞는 한국어 자막이 필요합니다.');
  const dir = await mkdtemp(join(job.dir, 'clip-'));
  await writeFile(join(dir, 'ko.srt'), subtitle, 'utf8');
  const result = join(dir, 'clip.mp4');
  await ffmpeg([
    '-ss', ffSeconds(args.start_ms), '-i', job.video,
    '-t', ffSeconds(args.end_ms - args.start_ms), '-map', '0:v:0', '-map', '0:a:0?',
    '-vf', "scale=trunc(iw/2)*2:trunc(ih/2)*2,subtitles=ko.srt:force_style='FontName=Malgun Gothic,FontSize=21,Outline=2,MarginV=23'",
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '19', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', result
  ], { cwd: dir, signal, timeout: 600000 });
  const info = await videoInfo(result, signal);
  const span = { start_ms: args.start_ms, end_ms: args.end_ms };
  await writeFile(join(dir, 'range.json'), JSON.stringify(span));
  return { file: result, srt: join(dir, 'ko.srt'), ...span, ...info };
}

const validateBox = box => {
  if (box.x + box.width > 1.000001 || box.y + box.height > 1.000001) throw new Error('영역이 화면을 벗어났습니다.');
};
const cropFilter = box => `crop=iw*${box.width}:ih*${box.height}:iw*${box.x}:ih*${box.y}`;

export async function makeCapture(args, signal) {
  const job = await getJob(args.job_id);
  const dir = await mkdtemp(join(job.dir, 'capture-'));
  const panels = [];
  for (const frame of args.frames) {
    if (frame.time_ms >= job.duration * 1000) throw new Error('캡처 시각이 영상 범위를 벗어났습니다.');
    if (frame.crop) validateBox(frame.crop);
    for (const mark of frame.marks) {
      if (mark.type !== 'arrow') validateBox(mark);
    }
    const image = join(dir, `frame-${panels.length}.png`);
    const filters = [...(frame.crop ? [cropFilter(frame.crop)] : []), 'scale=1400:1000:force_original_aspect_ratio=decrease'];
    await ffmpeg(['-ss', ffSeconds(frame.time_ms), '-i', job.video, '-vf', filters.join(','), '-frames:v', '1', image], { signal });
    panels.push({ ...frame, image });
  }
  const result = join(dir, 'capture.png');
  if (panels.length === 1 && !panels[0].title && panels[0].marks.length === 0) {
    await copyFile(panels[0].image, result);
  } else {
    const spec = join(dir, 'panels.json');
    await writeFile(spec, JSON.stringify({ panels, output: result }), 'utf8');
    await run('powershell', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'RemoteSigned', '-File',
      join(__dirname, 'annotate.ps1'), '-Spec', spec], { signal, timeout: 45000 });
  }
  return { file: result };
}

export async function makeGif(args, signal) {
  const job = await getJob(args.job_id);
  checkRange(job, args.start_ms, args.end_ms, 20000);
  if (args.crop) validateBox(args.crop);
  const dir = await mkdtemp(join(job.dir, 'gif-'));
  const result = join(dir, 'motion.gif');
  const filters = [...(args.crop ? [cropFilter(args.crop)] : []), 'fps=12', 'scale=720:-1:flags=lanczos'];
  const palette = filters.join(',') + ',split[a][b];[a]palettegen[p];[b][p]paletteuse';
  await ffmpeg(['-ss', ffSeconds(args.start_ms), '-t', ffSeconds(args.end_ms - args.start_ms),
    '-i', job.video, '-filter_complex', palette, '-an', '-loop', '0', result], { signal });
  return { file: result };
}

export async function capturePreview(path) {
  const bytes = await readFile(path);
  return bytes.length <= 5 * 1024 * 1024
    ? { type: 'image', data: bytes.toString('base64'), mimeType: 'image/png' } : null;
}
