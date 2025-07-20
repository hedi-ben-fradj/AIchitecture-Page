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
    const response = await fetch(splatUrl);

    if (!response.ok) {
      return new NextResponse(`Failed to fetch file: ${response.statusText}`, { status: response.status });
    }
    
    const fileBlob = await response.blob();
    const buffer = Buffer.from(await fileBlob.arrayBuffer());
    const base64 = buffer.toString('base64');
    
    // Return the raw base64 string
    return new NextResponse(base64, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
      },
    });

  } catch (error) {
    console.error('Splat proxy error:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
