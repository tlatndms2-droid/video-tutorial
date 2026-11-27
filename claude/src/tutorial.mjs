import { constants } from 'node:fs';
import { copyFile, lstat, mkdir, mkdtemp, readFile, realpath, readdir, rmdir, unlink, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, sep } from 'node:path';
import { getJob } from './runtime.mjs';
import { clock } from './subtitles.mjs';

async function containedAsset(dir, value, pattern) {
  if (!isAbsolute(value)) throw new Error('현재 작업에서 만든 자료의 절대 경로가 필요합니다.');
  const realDir = await realpath(dir);
  const path = await realpath(value);
  const child = relative(realDir, path).split(sep).join('/');
  if (!pattern.test(child) || !(await lstat(path)).isFile()) {
    throw new Error('이 작업에서 생성한 자료를 지정하세요.');
  }
  return path;
}

export async function assembleTutorial(args) {
  const job = await getJob(args.job_id);
  const dir = await mkdtemp(join(job.dir, 'tutorial-'));
  const assetDir = join(dir, 'media');
  await mkdir(assetDir);
  const lines = ['# ' + oneLine(args.title), ''];
  if (job.source) lines.push(`[원본 영상](${job.source})`, '');
  if (args.intro) lines.push(args.intro.trim(), '');
  for (const [index, section] of args.sections.entries()) {
    if (section.end_ms <= section.start_ms || section.end_ms > Math.ceil(job.duration * 1000)) {
      throw new Error('절의 원본 시각이 유효한지 확인하세요.');
    }
    const tag = String(index + 1).padStart(2, '0');
    const clip = await containedAsset(job.dir, section.clip, /^clip-[A-Za-z0-9]+\/clip\.mp4$/);
    const actual = JSON.parse(await readFile(join(dirname(clip), 'range.json'), 'utf8'));
    if (actual.start_ms !== section.start_ms || actual.end_ms !== section.end_ms) {
      throw new Error('절의 원본 시각과 실제로 자른 클립의 구간을 맞추세요.');
    }
    await copyFile(clip, join(assetDir, tag + '-clip.mp4'), constants.COPYFILE_EXCL);
    const span = clock(section.start_ms) + '–' + clock(section.end_ms);
    const startSec = Math.floor(section.start_ms / 1000);
    const shown = startSec >= 3600 ? clock(section.start_ms) : clock(section.start_ms).slice(3);
    // 영상 타임스탬프 분석기와 같은 링크 형식: &t=총초#t=표시시간
    const reference = job.source ? `[원본 ${span}](${job.source}&t=${startSec}#t=${shown})` : `원본 ${span}`;
    lines.push('## ' + oneLine(section.heading), '', reference, '', `![[media/${tag}-clip.mp4]]`, '', section.explanation.trim(), '');
    for (const [n, attachment] of section.captures.entries()) {
      const image = await containedAsset(job.dir, attachment.file, /^capture-[A-Za-z0-9]+\/capture\.png$/);
      const name = `${tag}-capture-${n + 1}.png`;
      await copyFile(image, join(assetDir, name), constants.COPYFILE_EXCL);
      lines.push(`![[media/${name}]]`, '', attachment.caption.trim(), '');
    }
    if (section.motion) {
      const motion = await containedAsset(job.dir, section.motion.file, /^gif-[A-Za-z0-9]+\/motion\.gif$/);
      await copyFile(motion, join(assetDir, tag + '-motion.gif'), constants.COPYFILE_EXCL);
      lines.push(`![[media/${tag}-motion.gif]]`, '', section.motion.caption.trim(), '');
    }
    if (section.check) lines.push('**확인할 결과** ' + section.check.trim(), '');
  }
  const note = join(dir, 'Tutorial.md');
  await writeFile(note, lines.join('\n'), { encoding: 'utf8', flag: 'wx' });
  return { directory: dir, note, sections: args.sections.length };
}

function oneLine(value) {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

function folderName(value) {
  if (/[<>:"/\\|?*\[\]#^\u0000-\u001f]/.test(value) || value.startsWith('.') || /[. ]$/.test(value)
      || /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(value)) {
    throw new Error('Obsidian 폴더로 쓸 수 있는 이름을 지정하세요.');
  }
  return value;
}

export async function saveToVault(args) {
  const job = await getJob(args.job_id);
  const note = await containedAsset(job.dir, args.note, /^tutorial-[A-Za-z0-9]+\/Tutorial\.md$/);
  const source = join(dirname(note), 'media');
  if (!isAbsolute(args.vault_root)) throw new Error('Vault의 절대 경로가 필요합니다.');
  const root = await realpath(args.vault_root);
  if (!(await lstat(join(root, '.obsidian'))).isDirectory()) throw new Error('Obsidian Vault 폴더를 지정하세요.');
  const name = folderName(args.folder);
  const target = join(root, name);
  const media = join(target, 'media');
  const files = await readdir(source, { withFileTypes: true });
  if (files.some(entry => !entry.isFile() || !/^\d{2}-(?:clip\.mp4|capture-\d+\.png|motion\.gif)$/.test(entry.name))) {
    throw new Error('문서 패키지 자료를 확인하지 못했습니다.');
  }
  const output = join(target, name + '.md');
  await mkdir(target);
  const written = [];
  let createdMedia = false;
  try {
    await mkdir(media);
    createdMedia = true;
    for (const entry of files) {
      const path = join(media, entry.name);
      await copyFile(join(source, entry.name), path, constants.COPYFILE_EXCL);
      written.push(path);
    }
    const markdown = await readFile(note, 'utf8');
    // Absolute vault paths keep separate tutorials with identical asset names unambiguous.
    await writeFile(output, markdown.replace(/^!\[\[media\//gm, `![[${name}/media/`), { encoding: 'utf8', flag: 'wx' });
  } catch (error) {
    await Promise.allSettled(written.map(path => unlink(path)));
    if (createdMedia) await rmdir(media).catch(() => {});
    await rmdir(target).catch(() => {});
    throw error;
  }
  return { note: output, vault_path: name + '/' + name + '.md', media: files.length };
}
