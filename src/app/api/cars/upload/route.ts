import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Car from '@/models/Car';
import { parse } from 'csv-parse/sync';

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    
    // Attempt to parse form data
    const formData = await req.formData();
    const files = formData.getAll('file') as Blob[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files uploaded' }, { status: 400 });
    }

    let totalAdded = 0;
    let totalUpdated = 0;
    const allErrors: string[] = [];

    for (const file of files) {
      try {
        const text = await file.text();
        const fileName = (file as any).name || 'Unknown File';
        
        // Parse CSV handling quotes and delimiters properly
        const records = parse(text, { skip_empty_lines: true });
        
        if (!records || records.length < 2) {
          allErrors.push(`${fileName}: CSV file is empty or missing data rows`);
          continue;
        }

        const headers: string[] = records[0].map((h: string) => h.trim().toLowerCase());
        
        // Expected minimal headers
        const requiredColumns = ['name', 'variant', 'price'];
        const missing = requiredColumns.filter(c => !headers.some(h => h.includes(c)));
        
        if (missing.length > 0) {
          allErrors.push(`${fileName}: Missing required columns: ${missing.join(', ')}`);
          continue;
        }

        // Identify index positions resiliently
        const modelIdx = headers.findIndex(h => h.includes('model') || h.includes('name'));
        const variantIdx = headers.findIndex(h => h.includes('variant'));
        const priceIdx = headers.findIndex(h => h.includes('price') || h.includes('exshowroom'));
        const categoryIdx = headers.findIndex(h => h.includes('category'));
        const fuelIdx = headers.findIndex(h => h.includes('fuel'));
        const transIdx = headers.findIndex(h => h.includes('transmission'));
        const colorIdx = headers.findIndex(h => h.includes('color'));
        
        const lengthIdx = headers.findIndex(h => h.includes('length'));
        const ccIdx = headers.findIndex(h => h.includes('engine') || h.includes('cc'));
        const suvIdx = headers.findIndex(h => h.includes('suv'));

        // Skip header row
        for (let i = 1; i < records.length; i++) {
            const cols = records[i];

            if (cols.length <= modelIdx || !cols[modelIdx]?.trim()) continue;

            const name = cols[modelIdx].trim();
            const variant = cols[variantIdx]?.trim() || 'Standard';
            const priceString = cols[priceIdx]?.replace(/[^0-9.]/g, '') || '0';
            const exShowroomPrice = Number(priceString);

            if (!name || isNaN(exShowroomPrice)) {
                allErrors.push(`${fileName} (Row ${i + 1}): Invalid Name or Price`);
                continue;
            }

            const fuelType = fuelIdx >= 0 && cols[fuelIdx]?.trim() ? cols[fuelIdx].trim() : 'Petrol';
            
            let transmission = 'Manual';
            if (transIdx >= 0 && cols[transIdx]?.trim()) {
                const tText = cols[transIdx].trim().toUpperCase();
                if (tText.includes('AMT')) transmission = 'AMT';
                else if (tText.includes('DCA')) transmission = 'DCA';
                else if (tText.includes('AUTO') || tText.includes('AT') || tText.includes('DCT')) transmission = 'Automatic';
                else transmission = 'Manual';
            }
            
            const category = categoryIdx >= 0 && cols[categoryIdx]?.trim() ? cols[categoryIdx].trim() : 'Hatchback';
            const availableColors = colorIdx >= 0 && cols[colorIdx]?.trim() ? cols[colorIdx].split(/[,;]/).map((c: string) => c.trim()) : [];
            
            const carLengthMeters = lengthIdx >= 0 && !isNaN(parseFloat(cols[lengthIdx])) ? parseFloat(cols[lengthIdx]) : 4;
            const engineCapacityCC = ccIdx >= 0 && !isNaN(parseInt(cols[ccIdx])) ? parseInt(cols[ccIdx]) : 1200;
            const isSUV = suvIdx >= 0 ? (cols[suvIdx]?.trim().toLowerCase() === 'true' || cols[suvIdx]?.trim().toLowerCase() === 'yes') : false;

            const carData = {
                name,
                variant,
                fuelType,
                transmission,
                exShowroomPrice,
                category,
                availableColors,
                carLengthMeters,
                engineCapacityCC,
                isSUV
            };

            const existing = await Car.findOne({ name, variant });
            if (existing) {
                await Car.updateOne({ _id: existing._id }, { $set: carData });
                totalUpdated++;
            } else {
                await Car.create(carData);
                totalAdded++;
            }
        }
      } catch (fileError: any) {
        allErrors.push(`Error processing a file: ${fileError.message}`);
      }
    }

    return NextResponse.json({ 
        success: true, 
        message: `Processed ${files.length} files. Total Added: ${totalAdded}, Updated: ${totalUpdated}.`,
        errors: allErrors.length > 0 ? allErrors : undefined
    });

  } catch (error: any) {
    console.error("CSV Upload Error:", error);
    return NextResponse.json({ error: error.message || 'Error processing CSV' }, { status: 500 });
  }
}

