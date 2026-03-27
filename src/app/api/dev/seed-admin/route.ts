import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    await connectToDatabase();

    const adminEmail = 'admin@quoteguru.com';
    const plainPassword = 'AdminPassword123!';

    // Check if the user already exists
    let user = await User.findOne({ email: adminEmail });
    
    if (user) {
      // If user exists, optionally reset their password just in case they are locked out!
      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(plainPassword, salt);
      // Give them top level access
      user.role = 'Owner';
      user.isActive = true;
      await user.save();
      
      return NextResponse.json({ 
        message: 'Admin account already existed. Password reset and permissions forced to Owner.',
        email: adminEmail,
        password: plainPassword
      }, { status: 200 });
    }

    // Hash the password securely
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(plainPassword, salt);

    // Create the master user
    user = await User.create({
      name: 'System Administrator',
      email: adminEmail,
      phone: '9999999999',
      passwordHash: hashedPassword,
      role: 'Owner',
      isActive: true
    });

    return NextResponse.json({
      message: 'Successfully injected a new Super User into the database!',
      email: adminEmail,
      password: plainPassword
    }, { status: 201 });

  } catch (error: any) {
    console.error('Seed Admin Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
