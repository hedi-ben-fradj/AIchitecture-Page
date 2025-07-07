import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const imageUrl = searchParams.get('url');

  if (!imageUrl) {
    return new NextResponse('Missing image URL', { status: 400 });
  }

  // Security: Ensure we are only proxying images from our Firebase Storage
  const allowedHostname = 'firebasestorage.googleapis.com';
  try {
    const url = new URL(imageUrl);
    if (url.hostname !== allowedHostname) {
      return new NextResponse('Invalid image host', { status: 400 });
    }
  } catch (error) {
    return new NextResponse('Invalid URL format', { status: 400 });
  }

  try {
    const response = await fetch(imageUrl, {
      headers: {
        // Pass through any necessary headers if needed in the future
      },
    });

    if (!response.ok) {
      return new NextResponse(`Failed to fetch image: ${response.statusText}`, { status: response.status });
    }

    const imageBlob = await response.blob();
    const headers = new Headers();
    headers.set('Content-Type', response.headers.get('Content-Type') || 'image/jpeg');
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');

    return new Response(imageBlob, {
      status: 200,
      headers: headers,
    });

  } catch (error) {
    console.error('Image proxy error:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
