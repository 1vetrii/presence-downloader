import { NextResponse } from 'next/server';
import { create } from 'youtube-dl-exec';
import path from 'path';
import fs from 'fs';
import { Readable } from 'stream';
// 1. Import the smart FFmpeg finder
import ffmpegPath from 'ffmpeg-static'; 

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Vercel Free Tier limit is usually 10-60s

export async function GET(request: Request) {
  const uniqueId = Date.now();
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  // 2. Detect Operating System
  const isWindows = process.platform === 'win32';
  const cwd = process.cwd();

  // 3. Select the correct yt-dlp binary
  const ytDlpFilename = isWindows ? 'yt-dlp.exe' : 'yt-dlp_linux';
  const ytDlpPath = path.resolve(cwd, ytDlpFilename);
  
  // 4. Use the path from the ffmpeg-static package (it handles OS auto-magic)
  // Fallback to local 'ffmpeg.exe' if on Windows and the package fails for some reason
  const finalFfmpegPath = ffmpegPath || path.resolve(cwd, 'ffmpeg.exe');

  const tempTemplate = path.join('/tmp', `temp-${uniqueId}.%(ext)s`);
  const finalFilePath = path.join('/tmp', `temp-${uniqueId}.wav`);
  // Note: On Vercel, we MUST use /tmp for writing files. 
  // On local Windows, /tmp usually maps to the drive root or we can fallback.
  const outputTemplate = isWindows ? path.join(cwd, `temp-${uniqueId}.%(ext)s`) : tempTemplate;
  const outputFinal = isWindows ? path.join(cwd, `temp-${uniqueId}.wav`) : finalFilePath;

  try {
    if (!url) throw new Error('No URL provided');
    console.log(`[${uniqueId}] System: ${process.platform}`);
    console.log(`[${uniqueId}] Using yt-dlp: ${ytDlpPath}`);
    console.log(`[${uniqueId}] Using ffmpeg: ${finalFfmpegPath}`);

    // 5. Critical: Linux binaries lose permissions during upload. We must fix them.
    if (!isWindows && fs.existsSync(ytDlpPath)) {
      try { fs.chmodSync(ytDlpPath, 0o755); } catch (e) {}
    }

    if (!fs.existsSync(ytDlpPath)) {
      throw new Error(`Engine missing: ${ytDlpFilename} not found in root.`);
    }

    const youtubedl = create(ytDlpPath);
    await youtubedl(url, {
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
      extractAudio: true,
      audioFormat: 'wav',
      output: outputTemplate,
      ffmpegLocation: finalFfmpegPath
    });

    if (!fs.existsSync(outputFinal)) throw new Error('Conversion failed');

    // 6. Stream
    const stats = fs.statSync(outputFinal);
    const nodeStream = fs.createReadStream(outputFinal);
    const stream = new ReadableStream({
      start(controller) {
        nodeStream.on('data', (chunk) => controller.enqueue(chunk));
        nodeStream.on('end', () => controller.close());
        nodeStream.on('error', (err) => controller.error(err));
      },
    });

    // Cleanup
    setTimeout(() => {
      try { if (fs.existsSync(outputFinal)) fs.unlinkSync(outputFinal); } catch (e) {}
    }, 60000);

    const headers = new Headers();
    headers.set('Content-Disposition', `attachment; filename="audio-${uniqueId}.wav"`);
    headers.set('Content-Type', 'audio/wav');

    return new NextResponse(stream, { headers });

  } catch (error: any) {
    console.error('SERVER ERROR:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}