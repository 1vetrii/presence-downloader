import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// A robust list of public Cobalt instances
const INSTANCES = [
  'https://api.cobalt.tools/api/json',
  'https://cobalt.api.wuk.sh/api/json',
  'https://api.server.cobalt.tools/api/json',
  'https://co.wuk.sh/api/json'
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) return NextResponse.json({ error: 'No URL provided' }, { status: 400 });

  console.log(`[Presence] Resolving link for: ${url}`);

  for (const instance of INSTANCES) {
    try {
      // 1. Ask the instance for the download LINK (not the file)
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
          aFormat: 'mp3', // MP3 is much faster/more reliable for these APIs than WAV
          filenamePattern: 'classic'
        })
      });

      const data = await response.json();

      if (data.url) {
        console.log(`[Presence] Link found on ${instance}. Redirecting...`);
        
        // 2. THE FIX: Redirect the user's browser to the file directly.
        // This offloads the heavy lifting to your computer, bypassing Vercel limits.
        return NextResponse.redirect(data.url);
      }
      
    } catch (error) {
      // Silently fail to the next instance
      console.log(`[Presence] Skipped ${instance}`);
    }
  }

  // If we get here, truly no instances worked
  return NextResponse.json(
    { error: 'Service Unavailable. Try a shorter video.' }, 
    { status: 503 }
  );
}