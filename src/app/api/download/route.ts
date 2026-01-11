import { NextResponse } from 'next/server';
import { create } from 'youtube-dl-exec';
import path from 'path';
import fs from 'fs';
import { Readable } from 'stream';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// CHANGE: We now use GET to allow direct browser downloads
export async function GET(request: Request) {
  const uniqueId = Date.now();
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  // 1. Resolve Paths
  const cwd = process.cwd();
  const ytDlpPath = path.resolve(cwd, 'yt-dlp.exe');
  const ffmpegPath = path.resolve(cwd, 'ffmpeg.exe');
  const tempTemplate = path.join(cwd, `temp-${uniqueId}.%(ext)s`);
  const finalFilePath = path.join(cwd, `temp-${uniqueId}.wav`);

  try {
    if (!url) throw new Error('No URL provided');
    console.log(`[${uniqueId}] Requesting: ${url}`);

    // 2. Check Files
    if (!fs.existsSync(ytDlpPath)) throw new Error('MISSING: yt-dlp.exe');
    if (!fs.existsSync(ffmpegPath)) throw new Error('MISSING: ffmpeg.exe');

    // 3. Convert
    const youtubedl = create(ytDlpPath);
    await youtubedl(url, {
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
      extractAudio: true,
      audioFormat: 'wav',
      output: tempTemplate,
      ffmpegLocation: ffmpegPath
    });

    if (!fs.existsSync(finalFilePath)) throw new Error('Conversion failed');

    // 4. Stream to Browser
    const stats = fs.statSync(finalFilePath);
    const nodeStream = fs.createReadStream(finalFilePath);
    const stream = new ReadableStream({
      start(controller) {
        nodeStream.on('data', (chunk) => controller.enqueue(chunk));
        nodeStream.on('end', () => controller.close());
        nodeStream.on('error', (err) => controller.error(err));
      },
    });

    // 5. Cleanup Hook (60s)
    setTimeout(() => {
      try { if (fs.existsSync(finalFilePath)) fs.unlinkSync(finalFilePath); } catch (e) {}
    }, 60000);

    const headers = new Headers();
    headers.set('Content-Disposition', `attachment; filename="audio-${uniqueId}.wav"`);
    headers.set('Content-Type', 'audio/wav');
    // Note: No Content-Length to avoid mismatch errors

    return new NextResponse(stream, { headers });

  } catch (error: any) {
    console.error('SERVER ERROR:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}