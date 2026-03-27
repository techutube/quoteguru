import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Customer from '@/models/Customer';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const body = await req.json();

    // Get current user for history tracking
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const decoded: any = verifyToken(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const existingCustomer = await Customer.findById(id);
    if (!existingCustomer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Detect changes dynamically across all schema fields
    const changes: Record<string, { from: any; to: any }> = {};
    const ignoreFields = ['_id', '__v', 'history', 'createdAt', 'updatedAt'];
    
    let hasChanges = false;
    
    Object.keys(body).forEach((key) => {
      if (ignoreFields.includes(key)) return;

      if (key === 'nominee' && typeof body.nominee === 'object') {
        if (!existingCustomer.nominee) existingCustomer.nominee = {};
        Object.keys(body.nominee).forEach(subKey => {
           let newVal = body.nominee[subKey];
           if (newVal === '') newVal = undefined; // Sanitize empty strings
           const oldVal = existingCustomer.nominee[subKey];
           
           if (newVal !== undefined && oldVal !== newVal) {
             changes[`nominee.${subKey}`] = { from: oldVal, to: newVal };
             existingCustomer.nominee[subKey] = newVal;
             hasChanges = true;
           }
        });
      } else {
        let newValue = body[key];
        if (newValue === '') newValue = undefined; // Sanitize empty enum strings
        const oldValue = existingCustomer[key];
        
        if (newValue !== undefined && oldValue !== newValue) {
          changes[key] = { from: oldValue, to: newValue };
          existingCustomer[key] = newValue;
          hasChanges = true;
        }
      }
    });

    if (hasChanges) {
      // Add to history
      existingCustomer.history.push({
        changedBy: decoded.userId,
        at: new Date(),
        changes: changes
      });
      await existingCustomer.save();
    }

    return NextResponse.json(existingCustomer);
  } catch (error: any) {
    console.error('Update Customer Error:', error);
    return NextResponse.json({ error: error.message || 'Error updating customer' }, { status: 400 });
  }
}
