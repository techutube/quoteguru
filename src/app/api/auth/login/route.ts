import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/User';
import { signToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    await connectToDatabase();

    // Make email lookup case-insensitive and trimmed
    const normalizedEmail = email.trim();
    const user = await User.findOne({ email: { $regex: new RegExp(`^${normalizedEmail}$`, 'i') } });

    let isPasswordValid = false;
    if (user) {
      // Fallback for existing plaintext passwords to prevent lockout while migrating
      // For new accounts, passwordHash will be a bcrypt hash.
      if (user.passwordHash === password.trim() || user.passwordHash === password) {
        isPasswordValid = true;
      } else {
        isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      }
    }

    if (!user || !isPasswordValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (!user.isActive) {
      return NextResponse.json({ error: 'Account is deactivated' }, { status: 403 });
    }

    const token = signToken({
      userId: user._id,
      role: user.role,
      name: user.name,
      email: user.email,
      reportsTo: user.reportsTo?.toString()
    });

    const cookieStore = await cookies();
    cookieStore.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 1 day
      path: '/',
    });

    return NextResponse.json({ 
      success: true, 
      user: { 
        id: user._id, 
        name: user.name, 
        role: user.role, 
        email: user.email,
        reportsTo: user.reportsTo
      } 
    });

  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message, stack: error.stack }, { status: 500 });
  }
}
