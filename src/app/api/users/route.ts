import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/User';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

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

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    
    // Quick role check for filtering
    const token = req.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
    const decoded = token ? decodeJwt(token) : null;
    
    console.log('API USERS: Decoded token role:', decoded?.role);
    console.log('API USERS: DB name from mongoose:', mongoose.connection.name);

    let filter = {};
    if (decoded) {
      const currentUserId = new mongoose.Types.ObjectId(decoded.userId);
      
      if (decoded.role === 'Super Admin' || decoded.role === 'Admin' || decoded.role === 'Owner') {
        // High level roles see all users EXCEPT themselves
        filter = { _id: { $ne: currentUserId } };
      } else {
        // For other roles (GM, GSM, SM, TL), find all subordinates RECURSIVELY
        const getAllSubordinateIds = async (parentId: mongoose.Types.ObjectId): Promise<mongoose.Types.ObjectId[]> => {
          const directSubordinates = await User.find({ reportsTo: parentId }).select('_id');
          const directIds = directSubordinates.map(u => u._id);
          
          let allSubIds = [...directIds];
          for (const subId of directIds) {
            const recursiveIds = await getAllSubordinateIds(subId);
            allSubIds = [...allSubIds, ...recursiveIds];
          }
          return allSubIds;
        };

        const subordinateIds = await getAllSubordinateIds(currentUserId);
        
        filter = { 
          _id: { $in: subordinateIds }
        };
      }
    }

    const users = await User.find(filter, { passwordHash: 0 })
      .populate('reportsTo', 'name')
      .sort({ createdAt: -1 });
    
    console.log('API USERS: Filter used:', JSON.stringify(filter));
    console.log('API USERS: Users found count:', users.length);

    return NextResponse.json(users);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { name, email, phone, password, role, reportsTo } = body;

    if (!name || !email || !password || !phone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validation
    if (name.length < 3) return NextResponse.json({ error: 'Name must be at least 3 characters' }, { status: 400 });
    if (!/^\d{10}$/.test(phone)) return NextResponse.json({ error: 'Phone number must be exactly 10 digits' }, { status: 400 });
    if (!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: 'Invalid email address format' }, { status: 400 });
    if (!email.toLowerCase().endsWith('@quoteguru.com')) return NextResponse.json({ error: 'Employee emails must use the @quoteguru.com domain' }, { status: 400 });

    // Role-based authorization for creation
    const token = req.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
    const decoded = token ? decodeJwt(token) : null;
    
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { role: currentUserRole } = decoded;
    
    // Define User Hierarchy for creation permissions
    const ROLES_HIERARCHY = [
      'Super Admin', 
      'Admin', 
      'Owner', 
      'GM', 
      'GSM', 
      'Sales Manager', 
      'Team Lead', 
      'Sales Associate',
      'F&I Manager'
    ];

    const currentRoleLevel = ROLES_HIERARCHY.indexOf(currentUserRole);
    const targetRoleLevel = ROLES_HIERARCHY.indexOf(role);

    // Can create anyone BELOW in hierarchy (higher index)
    // Super Admins and Admins have special rules handled by exceptions if needed
    let isAllowed = targetRoleLevel > currentRoleLevel;
    
    // Special exceptions for Admin/Super Admin
    if (currentUserRole === 'Super Admin') isAllowed = true;
    if (currentUserRole === 'Admin' && role !== 'Super Admin') isAllowed = true;

    if (!isAllowed) {
      return NextResponse.json({ 
        error: `As a ${currentUserRole}, you are not authorized to create a ${role}.` 
      }, { status: 403 });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
    }

    // Securely hash the password before saving it to the database
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      phone,
      passwordHash: hashedPassword, 
      role: role || 'Sales Associate',
      reportsTo: reportsTo || (['GM', 'GSM', 'Sales Manager', 'Team Lead'].includes(currentUserRole) ? decoded.userId : undefined)
    });

    const { passwordHash: _, ...userResponse } = user.toObject();

    return NextResponse.json(userResponse, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
