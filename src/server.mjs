import { readFile, writeFile } from 'node:fs/promises';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  available, downloadYoutube, getJob, inspectYoutube, localFile, newJob, saveJob, videoInfo, youtubeUrl
} from './runtime.mjs';
import { parseSrt } from './subtitles.mjs';
import { capturePreview, makeCapture, makeClip, makeGif } from './media.mjs';
import { assembleTutorial, saveToVault } from './tutorial.mjs';

const server = new McpServer({ name: 'video-tutorial', version: '0.1.0' });
const timeline = z.number().int().min(0).max(86_400_000);
const range = { start_ms: timeline, end_ms: timeline };
const job = { job_id: z.string().uuid() };
const url = z.string().url().max(1500);
const file = z.string().min(1).max(1024);
const short = z.string().trim().min(1).max(120);
const fraction = z.number().min(0).max(1);
const size = z.number().min(0.001).max(1);
const point = { x: fraction, y: fraction };
const box = { ...point, width: size, height: size };
const crop = z.object(box);
const mark = z.discriminatedUnion('type', [
  z.object({ type: z.literal('arrow'), ...point, to_x: fraction, to_y: fraction }),
  z.object({ type: z.literal('box'), ...box }),
  z.object({ type: z.literal('circle'), ...box }),
  z.object({ type: z.literal('label'), ...box, text: short })
]);
const frame = z.object({ time_ms: timeline, crop: crop.optional(), title: z.string().trim().max(24).optional(), marks: z.array(mark).max(12).default([]) });
const caption = z.object({ file, caption: z.string().trim().min(1).max(800) });
const section = z.object({
  heading: short, ...range, clip: file,
  explanation: z.string().trim().min(1).max(15000),
  captures: z.array(caption).max(8).default([]),
  motion: caption.optional(),
  check: z.string().trim().max(2000).optional()
});

function register(name, description, inputSchema, handler, readOnlyHint = false, openWorldHint = false) {
  server.registerTool(name, { description, inputSchema, annotations: { readOnlyHint, destructiveHint: false, openWorldHint } }, async (args, extra) => {
    try {
      const { preview, ...data } = await handler(args, extra.signal);
      const content = [{ type: 'text', text: JSON.stringify(data) }];
      if (preview) content.push(preview);
      return { content, structuredContent: data };
    } catch (error) {
      const data = { error: error.message };
      return { isError: true, content: [{ type: 'text', text: error.message }], structuredContent: data };
    }
  });
}

register('check_dependencies', 'Check the local tools used for video download and media editing.', {}, available, true);
register('inspect_youtube', 'List downloadable YouTube resolutions and subtitle languages. Present the available qualities before downloading.', { url },
  (args, signal) => inspectYoutube(args.url, signal), true, true);
register('download_source', 'Download the selected YouTube resolution exactly. Optionally save one selected manual or automatic SRT track.', {
  url, height: z.number().int().min(144).max(8640),
  language: z.string().regex(/^[A-Za-z0-9-]{1,30}$/).optional(),
  subtitle_kind: z.enum(['manual', 'automatic']).optional()
}, (args, signal) => {
  if (!!args.language !== !!args.subtitle_kind) throw new Error('자막 언어와 직접 작성·자동 생성 여부를 함께 지정하세요.');
  return downloadYoutube(args, signal);
}, false, true);

register('import_source', 'Use a local MP4 or other local video with an optional original SRT. Copy SRT into the job and leave the source video in place.', {
  video: file, subtitle: file.optional(), source_url: url.optional()
}, async (args, signal) => {
  const video = await localFile(args.video, ['.mp4', '.mkv', '.mov', '.webm']);
  const source = args.source_url ? youtubeUrl(args.source_url) : null;
  const info = await videoInfo(video, signal);
  const input = args.subtitle ? await localFile(args.subtitle, ['.srt']) : null;
  const srt = input ? await readFile(input, 'utf8') : null;
  if (srt !== null) parseSrt(srt);
  const item = await newJob();
  const subtitle = srt === null ? null : item.dir + '/source.srt';
  if (subtitle) await writeFile(subtitle, srt, 'utf8');
  const data = { job_id: item.id, video, subtitle, source, ...info };
  await saveJob(item, data);
  return data;
});

register('read_source_subtitles', 'Return a batch of original SRT cues with original-video timestamps for the Video Timestamp Analyzer.', {
  ...job, offset: z.number().int().nonnegative().default(0), limit: z.number().int().min(1).max(180).default(120)
}, async ({ job_id, offset, limit }) => {
  const item = await getJob(job_id);
  if (!item.subtitle) throw new Error('이 작업에는 원본 자막이 없습니다.');
  const cues = parseSrt(await readFile(item.subtitle, 'utf8'));
  const page = cues.slice(offset, offset + limit);
  return { cues: page, total: cues.length, next_offset: offset + page.length < cues.length ? offset + page.length : null };
}, true);

register('make_subtitled_clip', 'Cut the selected source-time range and burn Korean captions into it. Supply translated cues at original video times in milliseconds.', {
  ...job, ...range, korean_cues: z.array(z.object({ ...range, text: z.string().trim().min(1).max(1500) })).min(1).max(300)
}, makeClip);

register('make_capture', 'Extract one image or a two-image comparison. Use crop coordinates relative to the source and annotation coordinates relative to each cropped panel. Coordinates range from 0 to 1. Returns a preview when small enough.', {
  ...job, frames: z.array(frame).min(1).max(2)
}, async (args, signal) => {
  const result = await makeCapture(args, signal);
  return { ...result, preview: await capturePreview(result.file) };
});

register('make_motion_gif', 'Make a looping GIF for a specific short action, optionally in a cropped region. Use original video times in milliseconds.', {
  ...job, ...range, crop: crop.optional()
}, makeGif);

register('assemble_tutorial', 'Build a Markdown package from verified media and analysis. Every section presents the subtitled clip first, then explanation, captures, and optional motion GIF.', {
  ...job, title: short, intro: z.string().max(12000).optional(), sections: z.array(section).min(1).max(50)
}, assembleTutorial);

register('save_to_obsidian', 'Copy a completed package into a new folder in the explicitly selected local Obsidian vault. An existing folder causes an error.', {
  ...job, note: file, vault_root: file, folder: z.string().trim().min(1).max(120)
}, saveToVault);

server.connect(new StdioServerTransport()).catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
