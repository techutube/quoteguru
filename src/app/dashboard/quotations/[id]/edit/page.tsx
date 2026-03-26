'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { calculateOnRoadPrice, deriveBasePriceFromExShowroom } from '@/utils/pricingEngine';

export default function EditQuotationPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isResubmitting, setIsResubmitting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get('step');
    if (s) setStep(parseInt(s, 10));
  }, []);

  // Data fetching
  const [customers, setCustomers] = useState<any[]>([]);
  const [cars, setCars] = useState<any[]>([]);
  const [accessoriesLookup, setAccessoriesLookup] = useState<any[]>([]);

  // Selection state for discounts
  const [selectedDiscounts, setSelectedDiscounts] = useState({
    consumer: false,
    intervention: false,
    exchange: false,
    corporate: false
  });

  // Form State
  const [formData, setFormData] = useState({
    customer: '',
    car: '',
    selectedColor: '',
    accessories: [] as string[],
    charges: { registration: '' as number | string, insurance: '' as number | string, handling: 0, fastag: 550 as number | string, extendedWarranty: 0 },
    discounts: { dealer: 0, exchangeBonus: 0, corporate: 0, festival: 0, managerSpecial: 0 },
    exchangeVehicle: { brand: '', model: '', year: new Date().getFullYear(), condition: 'Good', expectedValue: 0 }
  });

  const [hasExchange, setHasExchange] = useState(false);
  const [selectedCarModel, setSelectedCarModel] = useState('');
  const [accessorySearch, setAccessorySearch] = useState('');
  const [initialStatus, setInitialStatus] = useState('');

  useEffect(() => {
    // Fetch all required data and existing quotation
    Promise.all([
      fetch('/api/customers').then(res => res.json()),
      fetch('/api/cars').then(res => res.json()),
      fetch('/api/accessories').then(res => res.json()),
      fetch(`/api/quotations/${id}`).then(res => res.json())
    ]).then(([custData, carData, accData, quoteData]) => {
      if (Array.isArray(custData)) setCustomers(custData);
      if (Array.isArray(carData)) setCars(carData);
      if (Array.isArray(accData)) setAccessoriesLookup(accData);
      
      if (quoteData && !quoteData.error) {
        setFormData({
          customer: quoteData.customer?._id || quoteData.customer,
          car: quoteData.car?._id || quoteData.car,
          selectedColor: quoteData.selectedColor || '',
          accessories: quoteData.accessories?.map((a: any) => a._id || a) || [],
          charges: {
            registration: quoteData.charges?.registration ?? '',
            insurance: quoteData.charges?.insurance ?? '',
            handling: quoteData.charges?.handling || 0,
            fastag: quoteData.charges?.fastag ?? 550,
            extendedWarranty: quoteData.charges?.extendedWarranty || 0
          },
          discounts: {
            dealer: quoteData.discounts?.dealer || 0,
            exchangeBonus: quoteData.discounts?.exchangeBonus || 0,
            corporate: quoteData.discounts?.corporate || 0,
            festival: quoteData.discounts?.festival || 0,
            managerSpecial: quoteData.discounts?.managerSpecial || 0
          },
          exchangeVehicle: quoteData.exchangeVehicle || { brand: '', model: '', year: new Date().getFullYear(), condition: 'Good', expectedValue: 0 }
        });
        
        // Auto-select checkboxes if values exist
        setSelectedDiscounts({
          consumer: !!quoteData.discounts?.festival,
          intervention: !!quoteData.discounts?.managerSpecial,
          exchange: !!quoteData.discounts?.exchangeBonus,
          corporate: !!quoteData.discounts?.corporate
        });

        setInitialStatus(quoteData.status);
        if (quoteData.exchangeVehicle) setHasExchange(true);
        if (quoteData.car) {
          const car = carData.find((c: any) => c._id === (quoteData.car?._id || quoteData.car));
          if (car) setSelectedCarModel(car.name);
        }
      } else {
        setError(quoteData?.error || 'Failed to load quotation');
      }
    }).catch(err => {
      console.error("Error fetching data:", err);
      setError('An error occurred while loading the quotation.');
    }).finally(() => {
        setLoading(false);
    });
  }, [id]);

  const autoSave = async () => {
    try {
      const payload: any = { ...formData, status: 'Draft' };
      if (!hasExchange) delete payload.exchangeVehicle;
      
      if (!selectedDiscounts.consumer) payload.discounts.festival = 0;
      if (!selectedDiscounts.intervention) payload.discounts.managerSpecial = 0;
      if (!selectedDiscounts.exchange) payload.discounts.exchangeBonus = 0;
      if (!selectedDiscounts.corporate) payload.discounts.corporate = 0;

      await fetch(`/api/quotations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (e) {
      console.error('Autosave failed:', e);
    }
  };

  const handleNext = () => {
    setStep(s => Math.min(7, s + 1));
    if (initialStatus === 'Draft') autoSave();
  };
  
  const handlePrev = () => {
    setStep(s => Math.max(1, s - 1));
    if (initialStatus === 'Draft') autoSave();
  };

  const handleAccessoryToggle = (accId: string) => {
    setFormData(prev => {
      const idx = prev.accessories.indexOf(accId);
      if (idx > -1) {
        return { ...prev, accessories: prev.accessories.filter(a => a !== accId) };
      } else {
        return { ...prev, accessories: [...prev.accessories, accId] };
      }
    });
  };

  const handleChargeChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, charges: { ...prev.charges, [field]: value === '' ? '' : Number(value) } }));
  };

  const handleDiscountChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, discounts: { ...prev.discounts, [field]: value === '' ? '' : Number(value) } }));
  };

  const calculatePreviewTotals = () => {
    const selectedCar = cars.find(c => c._id === formData.car);
    if (!selectedCar) return null;

    const { exShowroomPrice, fuelType, carLengthMeters, engineCapacityCC, isSUV } = selectedCar;
    const basePrice = deriveBasePriceFromExShowroom(exShowroomPrice, fuelType, carLengthMeters, engineCapacityCC, isSUV);
    
    let accTotal = 0;
    formData.accessories.forEach(accId => {
      const acc = accessoriesLookup.find(a => a._id === accId);
      if (acc) accTotal += acc.price;
    });

    const exVal = hasExchange ? Number(formData.exchangeVehicle.expectedValue) : 0;

    const result = calculateOnRoadPrice({
      basePrice,
      carLengthMeters,
      engineCapacityCC,
      fuelType,
      isSUV,
      registrationCharges: formData.charges.registration === '' ? undefined : Number(formData.charges.registration),
      accessoriesTotal: accTotal,
      handlingCharges: Number(formData.charges.handling),
      extendedWarranty: Number(formData.charges.extendedWarranty),
      fastagCharges: formData.charges.fastag === '' ? 550 : Number(formData.charges.fastag),
      dealerDiscount: Number(formData.discounts.dealer),
      exchangeBonus: selectedDiscounts.exchange ? Number(formData.discounts.exchangeBonus) : 0,
      corporateDiscount: selectedDiscounts.corporate ? Number(formData.discounts.corporate) : 0,
      specialDiscount: (selectedDiscounts.consumer ? Number(formData.discounts.festival) : 0) + 
                       (selectedDiscounts.intervention ? Number(formData.discounts.managerSpecial) : 0)
    });

    return { ...result, exVal };
  };

  const submitUpdate = async (statusOverride?: string) => {
    setIsResubmitting(true);
    setError('');
    try {
      const payload: any = { ...formData };
      if (statusOverride) payload.status = statusOverride;
      if (!hasExchange) delete payload.exchangeVehicle;
      
      // Clean up discounts that weren't selected
      if (!selectedDiscounts.consumer) payload.discounts.festival = 0;
      if (!selectedDiscounts.intervention) payload.discounts.managerSpecial = 0;
      if (!selectedDiscounts.exchange) payload.discounts.exchangeBonus = 0;
      if (!selectedDiscounts.corporate) payload.discounts.corporate = 0;

      const res = await fetch(`/api/quotations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update quotation');
      }
      
      router.push('/dashboard/quotations');
    } catch (err: any) {
      setError(err.message);
      setIsResubmitting(false);
    }
  };

  const totals = calculatePreviewTotals();
  const selectedCarDetails = cars.find(c => c._id === formData.car);

  if (loading) return <div className="p-8 text-center">Loading quotation for edit...</div>;

  return (
    <div className="builder-page">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/dashboard/quotations" className="btn btn-outline btn-sm">← Cancel</Link>
          <h2>Edit Quotation</h2>
        </div>
        <div className="step-indicator">Step {step} of 7</div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="builder-layout">
        <div className="wizard-card card">
          {step === 1 && (
            <div className="step-content">
              <h3>Step 1: Customer</h3>
              <div className="form-group mt-4">
                <label>Customer</label>
                <select value={formData.customer} onChange={e => setFormData({...formData, customer: e.target.value})} disabled>
                  {customers.map(c => <option key={c._id} value={c._id}>{c.name} ({c.phone})</option>)}
                </select>
                <small>Customer cannot be changed on an existing quotation.</small>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="step-content">
              <h3>Step 2: Select Car & Variant</h3>
              <div className="form-group mt-4">
                <label>Car Model *</label>
                <select 
                  value={selectedCarModel} 
                  onChange={e => {
                    setSelectedCarModel(e.target.value);
                    setFormData({...formData, car: '', selectedColor: ''});
                  }}
                >
                  <option value="">-- Select Model --</option>
                  {Array.from(new Set(cars.map(c => c.name))).map(name => <option key={name} value={name}>{name}</option>)}
                </select>
              </div>
              {selectedCarModel && (
                <div className="form-group mt-4">
                  <label>Variant *</label>
                  <select 
                    value={formData.car} 
                    onChange={e => {
                      const car = cars.find(c => c._id === e.target.value);
                      setFormData({...formData, car: e.target.value, selectedColor: car?.availableColors?.[0] || ''});
                    }}
                  >
                    <option value="">-- Select Variant --</option>
                    {cars.filter(c => c.name === selectedCarModel).map(c => (
                      <option key={c._id} value={c._id}>{c.variant} ({c.fuelType})</option>
                    ))}
                  </select>
                </div>
              )}
              {selectedCarDetails?.availableColors?.length > 0 && (
                <div className="form-group">
                  <label>Color Options *</label>
                  <select value={formData.selectedColor} onChange={e => setFormData({...formData, selectedColor: e.target.value})}>
                    {selectedCarDetails.availableColors.map((color: string, i: number) => <option key={i} value={color}>{color}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="step-content">
              <h3>Step 3: Accessories</h3>
              <div className="form-group mt-4">
                <input type="text" placeholder="Search accessories..." value={accessorySearch} onChange={e => setAccessorySearch(e.target.value)} />
              </div>
              <div className="accessories-grid mt-4">
                {accessoriesLookup
                  .filter(acc => !acc.applicableModels || acc.applicableModels.length === 0 || acc.applicableModels.includes(selectedCarModel))
                  .filter(acc => acc.name.toLowerCase().includes(accessorySearch.toLowerCase()))
                  .map(acc => (
                    <label key={acc._id} className="accessory-card">
                      <input type="checkbox" checked={formData.accessories.includes(acc._id)} onChange={() => handleAccessoryToggle(acc._id)} />
                      <div className="acc-info">
                        <span className="acc-name">{acc.name}</span>
                        <span className="acc-price">₹{acc.price.toLocaleString()}</span>
                      </div>
                    </label>
                  ))
                }
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="step-content">
              <h3>Step 4: Charges & Exchange</h3>
              <div className="grid-2 mt-4">
                <div className="form-group">
                  <label>Handling Charges</label>
                  <input type="number" value={formData.charges.handling} onChange={e => handleChargeChange('handling', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Fastag</label>
                  <input type="number" value={formData.charges.fastag} onChange={e => handleChargeChange('fastag', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Extended Warranty</label>
                  <input type="number" value={formData.charges.extendedWarranty} onChange={e => handleChargeChange('extendedWarranty', e.target.value)} />
                </div>
              </div>
              <hr className="my-4" />
              <div className="form-group checkbox-group">
                <label><input type="checkbox" checked={hasExchange} onChange={e => setHasExchange(e.target.checked)} /> Exchange vehicle</label>
              </div>
              {hasExchange && (
                <div className="grid-2 mt-2 bg-light p-4 rounded">
                  <div className="form-group">
                    <label>Brand/Model</label>
                    <input type="text" value={formData.exchangeVehicle.brand} onChange={e => setFormData({...formData, exchangeVehicle: {...formData.exchangeVehicle, brand: e.target.value}})} />
                  </div>
                  <div className="form-group">
                    <label>Value</label>
                    <input type="number" value={formData.exchangeVehicle.expectedValue} onChange={e => setFormData({...formData, exchangeVehicle: {...formData.exchangeVehicle, expectedValue: Number(e.target.value)}})} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 5: SELECT DISCOUNT TYPES */}
          {step === 5 && (
            <div className="step-content">
              <h3>Step 5: Select Discount Types</h3>
              <p className="subtitle mb-4">Choose which discounts you want to apply to this quotation.</p>
              
              <div className="checklist-container mt-4">
                <label className="checkbox-item card-item">
                  <input 
                    type="checkbox" 
                    checked={selectedDiscounts.consumer} 
                    onChange={e => setSelectedDiscounts({...selectedDiscounts, consumer: e.target.checked})} 
                  />
                  <div className="item-details">
                    <span className="item-title">Consumer offer</span>
                    <span className="item-sub">Standard promotional discounts for customers.</span>
                  </div>
                </label>

                <label className="checkbox-item card-item">
                  <input 
                    type="checkbox" 
                    checked={selectedDiscounts.intervention} 
                    onChange={e => setSelectedDiscounts({...selectedDiscounts, intervention: e.target.checked})} 
                  />
                  <div className="item-details">
                    <span className="item-title">Intervention discount</span>
                    <span className="item-sub">Special manager-approved price adjustments.</span>
                  </div>
                </label>

                <label className="checkbox-item card-item">
                  <input 
                    type="checkbox" 
                    checked={selectedDiscounts.exchange} 
                    onChange={e => setSelectedDiscounts({...selectedDiscounts, exchange: e.target.checked})} 
                  />
                  <div className="item-details">
                    <span className="item-title">Exchange</span>
                    <span className="item-sub">Additional bonus for vehicle trade-ins.</span>
                  </div>
                </label>

                <label className="checkbox-item card-item">
                  <input 
                    type="checkbox" 
                    checked={selectedDiscounts.corporate} 
                    onChange={e => setSelectedDiscounts({...selectedDiscounts, corporate: e.target.checked})} 
                  />
                  <div className="item-details">
                    <span className="item-title">Corporate</span>
                    <span className="item-sub">Discounts for corporate employees and partners.</span>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* STEP 6: APPLY DISCOUNTS */}
          {step === 6 && (
            <div className="step-content">
              <h3>Step 6: Apply Discounts</h3>
              <p className="subtitle text-danger mb-4">Note: Discounts above standard limits require Manager Approval.</p>
              
              <div className="grid-2">
                {selectedDiscounts.consumer && (
                  <div className="form-group">
                    <label>Consumer offer</label>
                    <input type="number" min="0" value={formData.discounts.festival} onChange={e => handleDiscountChange('festival', e.target.value)} />
                  </div>
                )}
                {selectedDiscounts.intervention && (
                  <div className="form-group">
                    <label>Intervention discount</label>
                    <input type="number" min="0" value={formData.discounts.managerSpecial} onChange={e => handleDiscountChange('managerSpecial', e.target.value)} />
                  </div>
                )}
                {selectedDiscounts.exchange && (
                  <div className="form-group">
                    <label>Exchange Bonus</label>
                    <input type="number" min="0" value={formData.discounts.exchangeBonus} onChange={e => handleDiscountChange('exchangeBonus', e.target.value)} />
                  </div>
                )}
                {selectedDiscounts.corporate && (
                  <div className="form-group">
                    <label>Corporate Discount</label>
                    <input type="number" min="0" value={formData.discounts.corporate} onChange={e => handleDiscountChange('corporate', e.target.value)} />
                  </div>
                )}
                {!selectedDiscounts.consumer && !selectedDiscounts.intervention && !selectedDiscounts.exchange && !selectedDiscounts.corporate && (
                  <p className="col-full text-center p-8 bg-light rounded text-secondary italic">
                    No discount types selected. Go back to select types or click Next to proceed.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* STEP 7: REVIEW */}
          {step === 7 && (
            <div className="step-content">
              <h3>Step 7: Review & Save</h3>
              {totals && (
                <div className="review-summary mt-4">
                  <table className="summary-table">
                    <tbody>
                      <tr><td>Base Price</td><td className="text-right">₹{totals.basePrice.toLocaleString()}</td></tr>
                      <tr><td>GST/Cess</td><td className="text-right">₹{(totals.gstAmount + totals.cessAmount).toLocaleString()}</td></tr>
                      <tr><td><strong>Ex-Showroom</strong></td><td className="text-right"><strong>₹{totals.exShowroomPrice.toLocaleString()}</strong></td></tr>
                      <tr><td>RTO & Insurance</td><td className="text-right">₹{(totals.rtoAmount + totals.insuranceAmount).toLocaleString()}</td></tr>
                      <tr><td>Accessories Total ({formData.accessories.length})</td><td className="text-right">₹{totals.accessoriesTotal.toLocaleString()}</td></tr>
                      <tr><td>Other Charges</td><td className="text-right">₹{(totals.handlingCharges + totals.extendedWarranty + totals.fastagCharges).toLocaleString()}</td></tr>
                      <tr className="discount"><td>Total Discount</td><td className="text-right">- ₹{totals.totalDiscount.toLocaleString()}</td></tr>
                      {hasExchange && <tr className="discount"><td>Exchange Value</td><td className="text-right">- ₹{totals.exVal.toLocaleString()}</td></tr>}
                      <tr className="final-price">
                        <td><strong>Final On-Road Price</strong></td>
                        <td className="text-right"><strong>₹{totals.finalOnRoadPrice.toLocaleString()}</strong></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
              <div className="action-buttons mt-4">
                <button className="btn btn-primary" disabled={isResubmitting} onClick={() => submitUpdate()}>
                  Save Changes
                </button>
                {initialStatus === 'Rejected' && (
                  <button className="btn btn-primary" disabled={isResubmitting} onClick={() => submitUpdate('Pending Approval')}>
                    Resubmit for Approval
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="wizard-footer">
            <button className="btn btn-outline" onClick={handlePrev} disabled={step === 1 || isResubmitting}>Back</button>
            {step < 7 && (
              <button className="btn btn-primary" onClick={handleNext} disabled={step === 2 && !formData.car}>Next</button>
            )}
          </div>
        </div>

        <div className="preview-card card hidden-mobile">
          <h3>Live Tracking</h3>
          {totals && (
            <div className="preview-content">
              <div className="preview-row"><span>Ex-Showroom</span><span>₹{totals.exShowroomPrice.toLocaleString()}</span></div>
              <div className="preview-row"><span>RTO/Ins</span><span>₹{(totals.rtoAmount + totals.insuranceAmount).toLocaleString()}</span></div>
              <div className="preview-row"><span>Accessories</span><span>₹{totals.accessoriesTotal.toLocaleString()}</span></div>
              <div className="preview-row discount"><span>Discounts</span><span>-₹{totals.totalDiscount.toLocaleString()}</span></div>
              <hr />
              <div className="preview-row final"><span>Final Price</span><span>₹{totals.finalOnRoadPrice.toLocaleString()}</span></div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .builder-page { display: flex; flex-direction: column; gap: var(--spacing-lg); }
        .page-header { display: flex; justify-content: space-between; align-items: center; }
        .step-indicator { background: var(--brand-blue-light); color: white; padding: 0.25rem 0.75rem; border-radius: 20px; font-weight: 600; font-size: 0.875rem; }
        .builder-layout { display: grid; grid-template-columns: 1fr 300px; gap: var(--spacing-lg); align-items: start; }
        .card { background: white; border-radius: 8px; border: 1px solid var(--border-color); display: flex; flex-direction: column; }
        .wizard-card { min-height: 500px; }
        .step-content { padding: 2rem; flex: 1; }
        .step-content h3 { color: var(--brand-blue); margin-bottom: 0.25rem; }
        .subtitle { color: var(--text-secondary); margin-bottom: 1rem; font-size: 0.875rem; }
        .wizard-footer { padding: 1.5rem 2rem; border-top: 1px solid var(--border-color); display: flex; justify-content: space-between; background: #f9fafb; }
        .form-group { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1rem; }
        .form-group label { font-weight: 600; font-size: 0.875rem; color: var(--text-secondary); }
        .form-group input, .form-group select { padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 4px; }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .col-full { grid-column: 1 / -1; }
        
        /* Checklist styles */
        .checklist-container { display: flex; flex-direction: column; gap: 0.75rem; }
        .card-item {
          background: white;
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-sm);
          border: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          padding: 1rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .card-item:hover { background-color: #f8fafc; border-color: var(--brand-blue-light); }
        .item-details { margin-left: 1rem; display: flex; flex-direction: column; }
        .item-title { font-weight: 700; color: var(--text-primary); }
        .item-sub { font-size: 0.875rem; color: var(--text-secondary); }

        .accessories-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 1rem; }
        .accessory-card { display: flex; align-items: center; gap: 0.75rem; padding: 1rem; border: 1px solid var(--border-color); border-radius: 8px; cursor: pointer; }
        .acc-info { display: flex; flex-direction: column; }
        .acc-name { font-weight: 600; }
        .acc-price { font-size: 0.875rem; color: var(--text-secondary); }
        .summary-table { width: 100%; border-collapse: collapse; }
        .summary-table td { padding: 0.75rem 0; border-bottom: 1px dashed var(--border-color); }
        .text-right { text-align: right; }
        .discount td { color: var(--danger); }
        .final-price td { font-size: 1.25rem; color: var(--brand-blue); border-bottom: none; padding-top: 1rem; }
        .preview-card { position: sticky; top: 2rem; padding: 1.5rem; }
        .preview-content { display: flex; flex-direction: column; gap: 0.75rem; }
        .preview-row { display: flex; justify-content: space-between; font-size: 0.875rem; }
        .preview-row.discount { color: var(--danger); }
        .preview-row.final { font-size: 1.125rem; font-weight: 700; margin-top: 0.5rem; }
        .action-buttons { display: flex; gap: 1rem; }
        .error-message { color: var(--danger); background: #fef2f2; padding: 0.75rem; border-radius: 4px; margin-bottom: 1rem; }
        
        .bg-light { background-color: #f9fafb; }
        .p-4 { padding: 1rem; }
        .rounded { border-radius: 0.5rem; }
        .text-danger { color: #dc2626; }
        .mb-4 { margin-bottom: 1rem; }
        .mt-4 { margin-top: 1rem; }
        .mt-2 { margin-top: 0.5rem; }
        .text-center { text-align: center; }
        .italic { font-style: italic; }

        @media (max-width: 768px) {
          .builder-layout { grid-template-columns: 1fr; }
          .hidden-mobile { display: none; }
          .grid-2 { grid-template-columns: 1fr; }
          .step-content { padding: 1rem; }
          .action-buttons { flex-direction: column; }
          .action-buttons .btn { width: 100%; }
        }
      `}</style>
    </div>
  );
}
