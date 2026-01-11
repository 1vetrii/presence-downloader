import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'No URL provided' }, { status: 400 });
  }

  try {
    console.log(`Processing: ${url}`);

    // 1. Ask Cobalt to process the video (No cookies needed)
    // We request 'wav' format specifically
    const cobaltResponse = await fetch('https://api.cobalt.tools/api/json', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'Presence-Downloader/1.0'
      },
      body: JSON.stringify({
        url: url,
        isAudioOnly: true,
        aFormat: 'wav', // Ask for WAV conversion
        filenamePattern: 'basic',
      })
    });

    const data = await cobaltResponse.json();

    // 2. Error Handling
    if (data.status === 'error' || !data.url) {
      throw new Error(data.text || 'Cobalt failed to process video');
    }

    // 3. Get the direct file stream from Cobalt
    const fileUrl = data.url;
    console.log('Stream obtained from Cobalt');

    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) throw new Error('Failed to fetch file stream');

    // 4. Create headers for the user download
    const headers = new Headers();
    const filename = `presence-${Date.now()}.wav`;
    
    headers.set('Content-Disposition', `attachment; filename="${filename}"`);
    headers.set('Content-Type', 'audio/wav');
    
    // Pass Content-Length if available so browser shows time remaining
    const size = fileResponse.headers.get('content-length');
    if (size) headers.set('Content-Length', size);

    // 5. Pipe the stream directly to the user
    return new NextResponse(fileResponse.body, { headers });

  } catch (error: any) {
    console.error('API Error:', error.message);
    return NextResponse.json(
      { error: 'Download failed. Video might be age-gated or too long.' }, 
      { status: 500 }
    );
  }
}