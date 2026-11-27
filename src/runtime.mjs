import { execFile } from 'node:child_process';
import { constants } from 'node:fs';
import { access, lstat, mkdir, readdir, readFile, realpath, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { homedir } from 'node:os';
import { delimiter, dirname, isAbsolute, join, resolve } from 'node:path';
import { promisify } from 'node:util';

const exec = promisify(execFile);
const jobs = join(process.env.LOCALAPPDATA || homedir(), 'Codex', 'VideoTutorial', 'jobs');
const lookup = new Map();

async function findExecutable(name) {
  const exe = process.platform === 'win32' ? name + '.exe' : name;
  const dirs = (process.env.PATH || '').split(delimiter).filter(Boolean);
  const override = process.env['VIDEO_TUTORIAL_' + name.toUpperCase().replace('-', '_')];
  const candidates = override ? [override] : dirs.filter(isAbsolute).map(dir => join(dir, exe));
  if (!override && process.platform === 'win32') {
    const local = process.env.LOCALAPPDATA;
    if (name === 'powershell') candidates.push(join(process.env.SystemRoot || 'C:/Windows', 'System32', 'WindowsPowerShell', 'v1.0', exe));
    if (name === 'yt-dlp') candidates.push(join(homedir(), '.codex', 'skills', 'clipgrab-video-subtitles', 'scripts', 'tools', exe));
    if (local && ['ffmpeg', 'ffprobe'].includes(name)) {
      const packages = join(local, 'Microsoft', 'WinGet', 'Packages');
      for (const pkg of (await readdir(packages).catch(() => [])).filter(n => n.startsWith('Gyan.FFmpeg'))) {
        const root = join(packages, pkg);
        for (const bin of await readdir(root)) candidates.push(join(root, bin, 'bin', exe));
      }
    }
  }
  for (const candidate of candidates.filter(isAbsolute)) {
    try {
      await access(candidate, constants.X_OK);
      return await realpath(candidate);
    } catch (error) {
      if (!['ENOENT', 'EACCES', 'ENOTDIR'].includes(error.code)) throw error;
    }
  }
  throw new Error(name + ' 실행 파일을 찾지 못했습니다.');
}

export async function executable(name) {
  if (!lookup.has(name)) lookup.set(name, await findExecutable(name));
  return lookup.get(name);
}

export async function run(name, args, { cwd, signal, timeout = 180000 } = {}) {
  signal?.throwIfAborted();
  try {
    const result = await exec(await executable(name), args, {
      cwd, signal, timeout, windowsHide: true, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024
    });
    return result.stdout;
  } catch (error) {
    if (signal?.aborted) throw new Error('작업이 취소되었습니다.');
    if (error.killed) throw new Error(name + ' 실행 시간이 초과되었습니다.');
    throw new Error(name + ' · ' + (error.stderr?.trim() || error.message).slice(-1500));
  }
}

export const ffmpeg = (args, options) => run('ffmpeg', [
  '-hide_banner', '-nostdin', '-loglevel', 'error', '-n', ...args
], options);

export async function newJob() {
  await mkdir(jobs, { recursive: true });
  const id = randomUUID();
  const dir = join(jobs, id);
  await mkdir(dir);
  return { id, dir };
}

export async function getJob(id) {
  if (!/^[a-f0-9-]{36}$/.test(id)) throw new Error('등록된 작업 ID가 필요합니다.');
  const dir = join(jobs, id);
  return { dir, ...(JSON.parse(await readFile(join(dir, 'source.json'), 'utf8'))) };
}

export const saveJob = (job, details) => writeFile(join(job.dir, 'source.json'), JSON.stringify(details));

export async function localFile(value, extensions) {
  if (!isAbsolute(value) || (process.platform === 'win32' && !/^[a-z]:[\\/]/i.test(value))) {
    throw new Error('PC에 있는 파일의 절대 경로가 필요합니다.');
  }
  const path = await realpath(value);
  if (!extensions.some(ext => path.toLowerCase().endsWith(ext)) || !(await lstat(path)).isFile()) {
    throw new Error('지원하는 형식의 파일을 지정하세요. ' + extensions.join(', '));
  }
  return path;
}

export async function videoInfo(path, signal) {
  const data = JSON.parse(await run('ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration:stream=codec_type,width,height', '-of', 'json', path
  ], { signal, timeout: 20000 }));
  const video = data.streams?.find(stream => stream.codec_type === 'video');
  const duration = Number(data.format?.duration);
  if (!video?.width || !video?.height || !(duration > 0)) throw new Error('재생 시간과 화면 크기가 있는 영상을 지정하세요.');
  return { duration, width: video.width, height: video.height, audio: data.streams.some(stream => stream.codec_type === 'audio') };
}

export async function available() {
  const results = await Promise.all(['ffmpeg', 'ffprobe', 'yt-dlp', 'powershell'].map(async name => {
    try { return [name, await executable(name)]; }
    catch { return [name, null]; }
  }));
  return Object.fromEntries(results);
}

export function youtubeUrl(value) {
  const url = new URL(value);
  const host = url.hostname.toLowerCase();
  if (!['www.youtube.com', 'youtube.com', 'm.youtube.com', 'youtu.be'].includes(host) ||
      url.protocol !== 'https:' || url.port || url.username || url.password) throw new Error('YouTube 영상 주소가 필요합니다.');
  const id = host === 'youtu.be' ? url.pathname.slice(1)
    : url.pathname === '/watch' ? url.searchParams.get('v')
    : /^\/(?:shorts|live)\/([^/]+)$/.exec(url.pathname)?.[1];
  if (!/^[\w-]{11}$/.test(id ?? '')) throw new Error('YouTube 영상 한 편의 주소를 지정하세요.');
  return 'https://www.youtube.com/watch?v=' + id;
}

const youtubeArgs = ['--ignore-config', '--no-playlist', '--no-progress',
  '--js-runtimes', 'node:' + process.execPath, '--socket-timeout', '15'];

export async function inspectYoutube(input, signal) {
  const source = youtubeUrl(input);
  const data = JSON.parse(await run('yt-dlp', [...youtubeArgs, '--no-warnings', '--dump-single-json', '--', source], { signal, timeout: 60000 }));
  const formats = data.formats || [];
  const audio = formats.some(f => f.vcodec === 'none' && f.acodec && f.acodec !== 'none');
  const heights = [...new Set(formats.filter(f => f.vcodec && f.vcodec !== 'none' && Number.isInteger(f.height)
    && (audio || (f.acodec && f.acodec !== 'none'))).map(f => f.height))].sort((a,b) => b-a);
  return {
    source, title: data.title, duration: data.duration, heights,
    manual: Object.keys(data.subtitles || {}), automatic: Object.keys(data.automatic_captions || {}).filter(key => key !== 'live_chat')
  };
}

export async function downloadYoutube({ url, height, language, subtitle_kind }, signal) {
  const source = youtubeUrl(url);
  const job = await newJob();
  const base = [...youtubeArgs, '--ffmpeg-location', dirname(await executable('ffmpeg'))];
  const options = { cwd: job.dir, signal, timeout: 900000 };
  if (language) {
    const lang = '^' + language.replaceAll('-', '\\-') + '$';
    await run('yt-dlp', [...base, '--skip-download', '--write-' + (subtitle_kind === 'automatic' ? 'auto-subs' : 'subs'),
      '--sub-langs', lang, '--convert-subs', 'srt', '-o', 'source.%(ext)s', '--', source], options);
  }
  const subtitle = (await readdir(job.dir)).find(file => /^source\..+\.srt$/i.test(file));
  if (language && !subtitle) throw new Error('선택한 언어와 종류의 자막을 받지 못했습니다.');
  const selection = [
    `bv[height=${height}][ext=mp4]+ba[ext=m4a]`, `b[height=${height}][ext=mp4]`,
    `bv[height=${height}]+ba`, `b[height=${height}]`
  ].join('/');
  await run('yt-dlp', [...base, '-f', selection, '--merge-output-format', 'mp4', '--remux-video', 'mp4',
    '-o', 'source.%(ext)s', '--', source], options);
  const video = join(job.dir, 'source.mp4');
  const info = await videoInfo(video, signal);
  if (info.height !== height) throw new Error('다운로드한 영상의 높이가 선택한 값과 다릅니다.');
  const result = { job_id: job.id, video, subtitle: subtitle ? join(job.dir, subtitle) : null, source, ...info };
  await saveJob(job, result);
  return result;
}
