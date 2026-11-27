function milliseconds(value) {
  const parts = /^(\d{2,}):(\d{2}):(\d{2})[,.](\d{3})$/.exec(value);
  if (!parts || Number(parts[2]) >= 60 || Number(parts[3]) >= 60) throw new Error('SRT의 시각 형식이 올바르지 않습니다.');
  const [, hours, minutes, seconds, fraction] = parts.map(Number);
  return ((hours * 60 + minutes) * 60 + seconds) * 1000 + fraction;
}

export function clock(ms, precise = false) {
  const seconds = Math.floor(ms / 1000);
  const pad = v => String(v).padStart(2, '0');
  const time = [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60].map(pad).join(':');
  return precise ? time + ',' + String(ms % 1000).padStart(3, '0') : time;
}

export function parseSrt(input) {
  const source = input.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  // Converted automatic tracks may contain blank lines inside a cue.
  const timing = /(?:^|\n)(?:[\t ]*\d+[\t ]*\n)?[\t ]*(\d{2,}:\d{2}:\d{2}[,.]\d{3})[\t ]+-->[\t ]+(\d{2,}:\d{2}:\d{2}[,.]\d{3})(?:[\t ]+[^\n]*)?(?:\n|$)/g;
  const headers = [...source.matchAll(timing)];
  const cues = headers.map((header, index) => ({
    start_ms: milliseconds(header[1]),
    end_ms: milliseconds(header[2]),
    text: source.slice(header.index + header[0].length, headers[index + 1]?.index).trim()
  })).filter(cue => cue.text && cue.end_ms > cue.start_ms);
  if (!cues.length) throw new Error('시간 정보와 텍스트가 들어 있는 SRT가 필요합니다.');
  return cues;
}

export function clipSrt(cues, start, end) {
  if (cues.some(c => c.end_ms <= c.start_ms)) throw new Error('자막의 종료 시각은 시작 시각보다 뒤여야 합니다.');
  return cues.filter(c => c.start_ms < end && c.end_ms > start)
    .sort((a, b) => a.start_ms - b.start_ms)
    .map((c, index) => {
      const a = clock(Math.max(c.start_ms, start) - start, true);
      const b = clock(Math.min(c.end_ms, end) - start, true);
      return `${index + 1}\n${a} --> ${b}\n${c.text.trim()}\n`;
    }).join('\n');
}
