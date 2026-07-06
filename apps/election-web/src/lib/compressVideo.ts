import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;

export async function loadFFmpeg() {
  if (ffmpeg) return ffmpeg;
  
  ffmpeg = new FFmpeg();
  
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd';
  
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });
  
  return ffmpeg;
}

export async function compressVideo(file: File): Promise<File> {
  const f = await loadFFmpeg();
  
  const inputName = 'input.mp4';
  const outputName = 'output.mp4';
  
  await f.writeFile(inputName, await fetchFile(file));
  
  // Compress video: scale down if needed, set CRF for compression, ultrafast for speed
  await f.exec([
    '-i', inputName,
    '-vcodec', 'libx264',
    '-crf', '28', // Lower is higher quality. 28 is good compression
    '-preset', 'ultrafast',
    '-vf', 'scale=854:480', // Compress down to 480p to ensure small file size
    outputName
  ]);
  
  const data = await f.readFile(outputName);
  
  return new File([data as any], file.name, {
    type: 'video/mp4',
  });
}
