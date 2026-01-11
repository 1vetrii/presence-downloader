import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// List of Cobalt instances to try in order
const INSTANCES = [
  'https://api.cobalt.tools/api/json',
  'https://cobalt.api.wuk.sh/api/json',
  'https://api.server.cobalt.tools/api/json' // Backup
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) return NextResponse.json({ error: 'No URL provided' }, { status: 400 });

  console.log(`[Presence] Processing: ${url}`);

  // Loop through instances until one works
  for (const instance of INSTANCES) {
    try {
      console.log(`[Presence] Trying engine: ${instance}`);
      
      const response = await fetch(instance, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'Presence-Downloader/2.0'
        },
        body: JSON.stringify({
          url: url,
          isAudioOnly: true,
          aFormat: 'wav',
          filenamePattern: 'classic'
        })
      });

      const data = await response.json();

      // If this instance failed, throw error to trigger the next loop
      if (data.status === 'error') {
        throw new Error(`Engine returned error: ${data.text}`);
      }
      
      if (!data.url) {
        throw new Error('No download URL returned');
      }

      console.log(`[Presence] Success on ${instance}`);

      // Fetch the actual file stream
      const fileResponse = await fetch(data.url);
      if (!fileResponse.ok) throw new Error('Failed to fetch file stream');

      const headers = new Headers();
      headers.set('Content-Disposition', `attachment; filename="presence-${Date.now()}.wav"`);
      headers.set('Content-Type', 'audio/wav');
      
      const size = fileResponse.headers.get('content-length');
      if (size) headers.set('Content-Length', size);

      return new NextResponse(fileResponse.body, { headers });

    } catch (error: any) {
      console.warn(`[Presence] Failed on ${instance}:`, error.message);
      // Continue to next instance...
    }
  }

  // If all instances fail
  return NextResponse.json(
    { error: 'All engines busy. Please try a different link or wait 10s.' }, 
    { status: 503 }
  );
}