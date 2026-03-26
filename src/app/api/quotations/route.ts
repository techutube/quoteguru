import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Quotation from '@/models/Quotation';
import Accessory from '@/models/Accessory';
import Car from '@/models/Car';
import Customer from '@/models/Customer';
import User from '@/models/User';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

// Helper to calculate pricing
async function calculatePricing(carId: string, accessoryIds: string[], charges: any, discounts: any, exchangeValue: number) {
  const car = await Car.findById(carId);
  const exShowroom = car ? car.exShowroomPrice : 0;
  
  let accessoriesTotal = 0;
  if (accessoryIds && accessoryIds.length > 0) {
    const accs = await Accessory.find({ _id: { $in: accessoryIds } });
    accessoriesTotal = accs.reduce((sum, acc) => sum + acc.price, 0);
  }

  const chargesTotal = 
    (charges?.registration || 0) + 
    (charges?.insurance || 0) + 
    (charges?.handling || 0) + 
    (charges?.fastag || 0) + 
    (charges?.extendedWarranty || 0);

  const subTotal = exShowroom + accessoriesTotal + chargesTotal;
  
  // Simple GST calculation logic (Assumed ~28% overall average for illustration, though in reality it varies by car category in India)
  // To keep it simple, we'll store GST explicitly or bake it into ex-showroom for now. Let's assume ex-showroom includes GST for simplicity,
  // or add a flat % if needed. We'll just set it to 0 as part of subTotal for this implementation unless requested otherwise.
  const gstTotal = Math.round(subTotal * 0.28); 

  const discountTotal = 
    (discounts?.dealer || 0) + 
    (discounts?.exchangeBonus || 0) + 
    (discounts?.corporate || 0) + 
    (discounts?.festival || 0) + 
    (discounts?.managerSpecial || 0);

  const finalOnRoadPrice = subTotal + gstTotal - discountTotal - (exchangeValue || 0);

  return {
    exShowroom,
    accessoriesTotal,
    chargesTotal,
    subTotal,
    gstTotal,
    discountTotal,
    exchangeValue: exchangeValue || 0,
    finalOnRoadPrice
  };
}

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    
    // Explicitly reference models to ensure they are registered in Mongoose
    // This prevents "MissingSchemaError: Schema hasn't been registered for model" errors in Next.js HMR
    const _models = [Quotation, Accessory, Car, Customer, User]; 

    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    let userFilter: any = {};
    if (token) {
      const decoded: any = verifyToken(token);
      if (decoded) {
        // Recursive subordinate lookup
        const getAllSubordinateIds = async (parentId: string): Promise<string[]> => {
          const directSubordinates = await User.find({ reportsTo: parentId }).select('_id');
          const directIds = directSubordinates.map(u => u._id.toString());
          
          let allSubIds = [...directIds];
          for (const subId of directIds) {
            const recursiveIds = await getAllSubordinateIds(subId);
            allSubIds = [...allSubIds, ...recursiveIds];
          }
          return allSubIds;
        };

        const subordinateIds = await getAllSubordinateIds(decoded.userId);
        const hierarchyUserIds = [decoded.userId, ...subordinateIds];

        if (['Owner', 'Admin', 'Super Admin', 'F&I Manager'].includes(decoded.role)) {
          // See all non-drafts by default, but only see Drafts if in hierarchy
          userFilter = {
             $or: [
               { status: { $ne: 'Draft' } },
               { salesperson: { $in: hierarchyUserIds } }
             ]
          };
        } else {
          userFilter = { salesperson: { $in: hierarchyUserIds } };
        }
      }
    }

    const quotations = await Quotation.find(userFilter)
      .populate('customer', 'name phone')
      .populate('car', 'name variant')
      .populate('salesperson', 'name email role')
      .sort({ createdAt: -1 });
      
    return NextResponse.json(quotations);
  } catch (error) {
    console.error("GET Quotations Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const decoded: any = verifyToken(token);
    
    const body = await req.json();
    
    // Generate unique Quotation Number (e.g., QUOTE-YYYYMMDD-XXXX)
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await Quotation.countDocuments({ quotationNumber: { $regex: `^QUOTE-${dateStr}` } });
    const qNumber = `QUOTE-${dateStr}-${String(count + 1).padStart(4, '0')}`;

    const exchangeVal = body.exchangeVehicle?.expectedValue || 0;
    
    const pricing = await calculatePricing(
      body.car, 
      body.accessories, 
      body.charges, 
      body.discounts,
      exchangeVal
    );

    const quotation = await Quotation.create({
      ...body,
      quotationNumber: qNumber,
      salesperson: decoded.userId,
      pricing,
      status: body.status || 'Draft'
    });

    return NextResponse.json(quotation, { status: 201 });
  } catch (error: any) {
    console.error("POST Quotation Error:", error);
    return NextResponse.json({ error: error.message || 'Error creating quotation' }, { status: 400 });
  }
}
