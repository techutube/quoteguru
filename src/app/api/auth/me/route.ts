import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// A simple JWT decoder for edge compatibility, mirroring middleware
function decodeJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch(e) {
    return null;
  }
}

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const decoded = decodeJwt(token);
  console.log('API ME: Decoded user:', decoded?.email, 'Role:', decoded?.role);

  if (!decoded) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  return NextResponse.json({ 
    user: {
      id: decoded.userId,
      role: decoded.role,
      name: decoded.name,
      email: decoded.email,
      reportsTo: decoded.reportsTo
    } 
  });
}
