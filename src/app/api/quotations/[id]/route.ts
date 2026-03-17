import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Quotation from '@/models/Quotation';
import Accessory from '@/models/Accessory';
import Car from '@/models/Car';
import User from '@/models/User';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { calculateOnRoadPrice, deriveBasePriceFromExShowroom } from '@/utils/pricingEngine';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    
    // Ensure models are registered
    const _reqModels = [User, Car, Accessory];

    const quotation = await Quotation.findById(id)
      .populate('customer')
      .populate('car')
      .populate('accessories')
      .populate('salesperson', 'name email')
      .populate('history.changedBy', 'name');
      
    if (!quotation) return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });
    return NextResponse.json(quotation);
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

async function recalculateQuotationPricing(carId: string, accessoryIds: string[], charges: any, discounts: any) {
  const car = await Car.findById(carId);
  if (!car) throw new Error('Car not found');

  const accessories = await Accessory.find({ _id: { $in: accessoryIds } });
  const accTotal = accessories.reduce((sum, a) => sum + a.price, 0);

  const basePrice = deriveBasePriceFromExShowroom(
    car.exShowroomPrice,
    car.fuelType,
    car.carLengthMeters,
    car.engineCapacityCC,
    car.isSUV
  );

  const result = calculateOnRoadPrice({
    basePrice,
    carLengthMeters: car.carLengthMeters,
    engineCapacityCC: car.engineCapacityCC,
    fuelType: car.fuelType,
    isSUV: car.isSUV,
    registrationCharges: charges.registration === '' ? undefined : Number(charges.registration),
    accessoriesTotal: accTotal,
    handlingCharges: Number(charges.handling),
    extendedWarranty: Number(charges.extendedWarranty),
    fastagCharges: charges.fastag === '' ? 550 : Number(charges.fastag),
    dealerDiscount: Number(discounts.dealer),
    exchangeBonus: Number(discounts.exchangeBonus),
    corporateDiscount: Number(discounts.corporate),
    specialDiscount: Number(discounts.festival) + Number(discounts.managerSpecial)
  });

  return result;
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

    // Permissions Logic:
    // 1. If Approved: Only Manager or Admin can edit.
    // 2. If Rejected: Salesperson (creator) can edit and resubmit.
    // 3. If Pending Approval: Only Manager can Approve/Reject (dealt with via status update).
    
    const isManager = decoded.role === 'Manager' || decoded.role === 'Admin';
    const isCreator = quotation.salesperson.toString() === decoded.userId;

    if (quotation.status === 'Approved' && !isManager) {
      return NextResponse.json({ error: 'Only managers can edit approved quotations' }, { status: 403 });
    }

    if (quotation.status === 'Rejected' && !isCreator && !isManager) {
      return NextResponse.json({ error: 'Unauthorized to edit this quotation' }, { status: 403 });
    }

    // Detect Changes for History
    const changes: any = {};
    const trackFields = ['status', 'selectedColor', 'managerComments'];
    trackFields.forEach(field => {
      if (body[field] !== undefined && body[field] !== quotation[field]) {
        changes[field] = { from: quotation[field], to: body[field] };
        quotation[field] = body[field];
      }
    });

    // Handle Complex Nested Fields (Discounts, Charges, Accessories)
    const checkNested = (fieldName: string) => {
      if (!body[fieldName]) return;
      Object.keys(body[fieldName]).forEach(key => {
        const oldVal = quotation[fieldName][key];
        const newVal = body[fieldName][key];
        if (newVal !== undefined && oldVal !== newVal) {
          changes[`${fieldName}.${key}`] = { from: oldVal, to: newVal };
          quotation[fieldName][key] = newVal;
        }
      });
    };

    checkNested('charges');
    checkNested('discounts');

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
        quotation.discounts
      );
      
      // Track pricing changes
      if (newPricing.finalOnRoadPrice !== quotation.pricing.finalOnRoadPrice) {
        changes.finalOnRoadPrice = { from: quotation.pricing.finalOnRoadPrice, to: newPricing.finalOnRoadPrice };
      }
      quotation.pricing = newPricing;
    }

    if (Object.keys(changes).length > 0) {
      // If a salesperson edits a rejected quotation, move it back to Pending or Draft
      if (quotation.status === 'Rejected' && !isManager) {
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
