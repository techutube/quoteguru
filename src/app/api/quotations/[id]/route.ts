import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Quotation from '@/models/Quotation';
import Accessory from '@/models/Accessory';
import Car from '@/models/Car';
import Customer from '@/models/Customer';
import User from '@/models/User';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { calculateOnRoadPrice, deriveBasePriceFromExShowroom } from '@/utils/pricingEngine';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    
    // Ensure models are registered
    const _reqModels = [User, Car, Accessory, Customer];

    const quotation = await Quotation.findById(id)
      .populate('customer')
      .populate('car')
      .populate('accessories')
      .populate('salesperson', 'name email role')
      .populate('history.changedBy', 'name');
      
    if (!quotation) return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });
    return NextResponse.json(quotation);
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

async function recalculateQuotationPricing(carId: string, accessoryIds: string[], charges: any, discounts: any, exchangeValue: number = 0) {
  const car = await Car.findById(carId);
  if (!car) throw new Error('Car not found');

  const accessories = await Accessory.find({ _id: { $in: accessoryIds } });
  const accTotal = accessories.reduce((sum, a) => sum + a.price, 0);

  const exShowroom = car.exShowroomPrice;
  const chargesTotal = 
    (Number(charges?.registration) || 0) + 
    (Number(charges?.insurance) || 0) + 
    (Number(charges?.handling) || 0) + 
    (Number(charges?.fastag) || 0) + 
    (Number(charges?.extendedWarranty) || 0);

  const subTotal = exShowroom + accTotal + chargesTotal;
  const gstTotal = Math.round(subTotal * 0.28); 
  
  const discountTotal = 
    (Number(discounts?.dealer) || 0) + 
    (Number(discounts?.exchangeBonus) || 0) + 
    (Number(discounts?.corporate) || 0) + 
    (Number(discounts?.festival) || 0) + 
    (Number(discounts?.managerSpecial) || 0);

  const finalOnRoadPrice = subTotal + gstTotal - discountTotal - exchangeValue;

  return {
    exShowroom,
    accessoriesTotal: accTotal,
    chargesTotal,
    subTotal,
    gstTotal,
    discountTotal,
    exchangeValue,
    finalOnRoadPrice
  };
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const body = await req.json();

    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const decoded: any = verifyToken(token);
    if (!decoded || !decoded.userId) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const quotation = await Quotation.findById(id);
    if (!quotation) return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });

    // Permissions Logic (Hierarchical):
    const isPowerUser = ['Owner', 'GM', 'GSM', 'Admin', 'Super Admin'].includes(decoded.role);
    const isSalesManager = decoded.role === 'Sales Manager';
    const isFinance = decoded.role === 'F&I Manager';
    const isCreator = quotation.salesperson.toString() === decoded.userId;

    // 1. Finance can always edit (they handle loans/warranties after the fact)
    // 2. Power users (Owner/GM/GSM) can edit anything
    // 3. Sales Manager can edit their own or their team's (but let's keep it simple: power users)
    
    if (!isPowerUser && !isFinance && !isCreator && !isSalesManager) {
      return NextResponse.json({ error: 'Unauthorized to edit this quotation' }, { status: 403 });
    }

    if (quotation.status === 'Approved' && !isPowerUser && !isFinance) {
      return NextResponse.json({ error: 'Only Managers or Finance can edit approved quotations' }, { status: 403 });
    }

    // Detect Changes for History
    const changes: any = {};
    const trackFields = ['status', 'selectedColor', 'managerComments'];
    
    // Approval Restriction Logic
    const isChangingToApproved = body.status === 'Approved' && quotation.status !== 'Approved';
    if (isChangingToApproved) {
      // Fetch creator role
      const creator = await User.findById(quotation.salesperson).select('role');
      const creatorRole = creator?.role || 'Sales Associate';
      const approverRole = decoded.role;
      const isOwner = approverRole === 'Owner';
      const isGM = approverRole === 'GM';
      const isGSM = approverRole === 'GSM';
      const isSM = approverRole === 'Sales Manager';
      const isSelf = quotation.salesperson.toString() === decoded.userId;

      let canApprove = false;

      if (creatorRole === 'Sales Associate' || creatorRole === 'Team Lead') {
        canApprove = isSM || isGSM || isGM || isOwner;
      } else if (creatorRole === 'Sales Manager') {
        canApprove = isGSM || isGM;
      } else if (creatorRole === 'GSM') {
        canApprove = isGM;
      } else if (creatorRole === 'GM') {
        canApprove = isOwner || isSelf;
      } else if (creatorRole === 'Owner') {
        canApprove = isOwner && isSelf;
      }

      if (!canApprove) {
        return NextResponse.json({ 
          error: `As a ${approverRole}, you are not authorized to approve a quotation created by a ${creatorRole}.` 
        }, { status: 403 });
      }
    }

    trackFields.forEach(field => {
      if (body[field] !== undefined && body[field] !== quotation[field]) {
        changes[field] = { from: quotation[field], to: body[field] };
        quotation[field] = body[field];
      }
    });

    // Handle Complex Nested Fields (Discounts, Charges, Accessories, etc.)
    const checkNested = (fieldName: string) => {
      if (!body[fieldName]) return;
      if (!quotation[fieldName]) quotation[fieldName] = {};
      
      Object.keys(body[fieldName]).forEach(key => {
        const oldVal = quotation[fieldName][key];
        let newVal = body[fieldName][key];

        // Sanitize empty strings to prevent Mongoose enum validation errors
        if (newVal === '') {
          newVal = undefined;
        }

        if (newVal !== undefined && oldVal !== newVal) {
          changes[`${fieldName}.${key}`] = { from: oldVal, to: newVal };
          quotation[fieldName][key] = newVal;
        }
      });
    };

    checkNested('charges');
    checkNested('discounts');
    checkNested('location');
    checkNested('enquiryDetails');
    checkNested('finance');

    if (body.accessories && JSON.stringify(body.accessories) !== JSON.stringify(quotation.accessories)) {
      changes.accessories = { from: quotation.accessories, to: body.accessories };
      quotation.accessories = body.accessories;
    }

    if (body.car && body.car.toString() !== quotation.car.toString()) {
      changes.car = { from: quotation.car, to: body.car };
      quotation.car = body.car;
    }

    const hasPricingChanges = !!(body.car || body.accessories || body.charges || body.discounts);

    if (hasPricingChanges) {
      const newPricing = await recalculateQuotationPricing(
        quotation.car.toString(),
        quotation.accessories.map((a: any) => a.toString()),
        quotation.charges,
        quotation.discounts,
        body.exchangeVehicle?.expectedValue || quotation.exchangeVehicle?.expectedValue || 0
      );
      
      // Track pricing changes
      if (newPricing.finalOnRoadPrice !== quotation.pricing.finalOnRoadPrice) {
        changes.finalOnRoadPrice = { from: quotation.pricing.finalOnRoadPrice, to: newPricing.finalOnRoadPrice };
      }
      quotation.pricing = newPricing;
    }

    if (Object.keys(changes).length > 0) {
      // If a salesperson edits a rejected quotation, move it back to Pending or Draft
      const isPowerUser = ['Owner', 'GM', 'GSM', 'Admin', 'Super Admin'].includes(decoded.role);
      if (quotation.status === 'Rejected' && !isPowerUser) {
        changes.status = { from: 'Rejected', to: 'Pending Approval' };
        quotation.status = 'Pending Approval';
      }

      quotation.history.push({
        changedBy: decoded.userId,
        at: new Date(),
        changes
      });
      await quotation.save();
    }

    return NextResponse.json(quotation);
  } catch (error: any) {
    console.error('Update Quotation Error:', error);
    return NextResponse.json({ error: error.message || 'Error updating quotation' }, { status: 400 });
  }
}
