import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const splatUrl = searchParams.get('url');

  if (!splatUrl) {
    return new NextResponse('Missing splat URL', { status: 400 });
  }

  // Security: Ensure we are only proxying files from allowed hostnames
  const allowedHostnames = ['firebasestorage.googleapis.com', 'huggingface.co'];
  try {
    const url = new URL(splatUrl);
    if (!allowedHostnames.includes(url.hostname)) {
      return new NextResponse('Invalid file host', { status: 400 });
    }
  } catch (error) {
    return new NextResponse('Invalid URL format', { status: 400 });
  }

  try {
    const response = await fetch(splatUrl, {
      headers: {
        // Pass through any necessary headers if needed in the future
      },
    });

    if (!response.ok) {
      return new NextResponse(`Failed to fetch file: ${response.statusText}`, { status: response.status });
    }

    // Get the blob and stream it back
    const fileBlob = await response.blob();
    const headers = new Headers();
    // Set a generic content type for binary data, or be more specific if possible
    headers.set('Content-Type', response.headers.get('Content-Type') || 'application/octet-stream');
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    
    // We are proxying, so we can set the CORS header here to satisfy the browser
    headers.set('Access-Control-Allow-Origin', '*'); 

    return new Response(fileBlob, {
      status: 200,
      headers: headers,
    });

  } catch (error) {
    console.error('Splat proxy error:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
