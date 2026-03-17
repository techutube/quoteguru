'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { calculateOnRoadPrice, deriveBasePriceFromExShowroom } from '@/utils/pricingEngine';

export default function NewQuotationPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Data fetching
  const [customers, setCustomers] = useState<any[]>([]);
  const [cars, setCars] = useState<any[]>([]);
  const [accessoriesLookup, setAccessoriesLookup] = useState<any[]>([]);

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

  useEffect(() => {
    // Fetch all required data for the form
    Promise.all([
      fetch('/api/customers').then(res => res.json()),
      fetch('/api/cars').then(res => res.json()),
      fetch('/api/accessories').then(res => res.json())
    ]).then(([custData, carData, accData]) => {
      if (Array.isArray(custData)) setCustomers(custData);
      if (Array.isArray(carData)) setCars(carData);
      if (Array.isArray(accData)) setAccessoriesLookup(accData);
      
      // Load draft AFTER data is fetched so customer select has options
      const savedDraft = localStorage.getItem('quotationDraft_new');
      if (savedDraft) {
        try {
          const parsedDraft = JSON.parse(savedDraft);
          if (parsedDraft.formData) {
             setFormData(parsedDraft.formData);
             if (parsedDraft.formData.car) {
                const carDetails = carData.find((c: any) => c._id === parsedDraft.formData.car);
                if (carDetails) setSelectedCarModel(carDetails.name);
             }
          }
          if (parsedDraft.step) setStep(parsedDraft.step);
          if (parsedDraft.hasExchange !== undefined) setHasExchange(parsedDraft.hasExchange);
        } catch (e) {
          console.error("Could not parse saved draft", e);
        }
      }
    }).catch(err => console.error("Error fetching form data:", err));
  }, []);

  const handleNext = () => {
    const nextStep = Math.min(6, step + 1);
    setStep(nextStep);
    localStorage.setItem('quotationDraft_new', JSON.stringify({ formData, step: nextStep, hasExchange }));
  };
  
  const handlePrev = () => setStep(s => Math.max(1, s - 1));

  const handleAccessoryToggle = (id: string) => {
    setFormData(prev => {
      const idx = prev.accessories.indexOf(id);
      if (idx > -1) {
        return { ...prev, accessories: prev.accessories.filter(a => a !== id) };
      } else {
        return { ...prev, accessories: [...prev.accessories, id] };
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
    if (!selectedCar) {
       return {
         basePrice: 0, gstRate: 0, gstAmount: 0, cessRate: 0, cessAmount: 0,
         exShowroomPrice: 0, rtoAmount: 0, insuranceAmount: 0, accessoriesTotal: 0,
         handlingCharges: 0, extendedWarranty: 0, fastagCharges: 0, subtotal: 0,
         totalDiscount: 0, finalOnRoadPrice: 0, exVal: 0
       };
    }

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
      exchangeBonus: Number(formData.discounts.exchangeBonus),
      corporateDiscount: Number(formData.discounts.corporate),
      specialDiscount: Number(formData.discounts.festival) + Number(formData.discounts.managerSpecial)
    });

    return { ...result, exVal };
  };

  const submitQuotation = async (status: string) => {
    setLoading(true);
    setError('');
    try {
      const payload = { ...formData, status };
      if (!hasExchange) {
        delete (payload as any).exchangeVehicle;
      }
      
      const res = await fetch('/api/quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit');
      }
      
      localStorage.removeItem('quotationDraft_new');
      router.push('/dashboard/quotations');
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const totals = calculatePreviewTotals();
  const selectedCarDetails = cars.find(c => c._id === formData.car);

  return (
    <div className="builder-page">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/dashboard/quotations" className="btn btn-outline btn-sm">← Back</Link>
          <h2>Quotation Builder</h2>
        </div>
        <div className="step-indicator">
          Step {step} of 6
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="builder-layout">
        <div className="wizard-card card">
          {/* STEP 1: CUSTOMER */}
          {step === 1 && (
            <div className="step-content">
              <h3>Step 1: Select Customer</h3>
              <p className="subtitle">Choose an existing customer to create a quotation for.</p>
              
              <div className="form-group mt-4">
                <label>Customer *</label>
                <select 
                  value={formData.customer} 
                  onChange={e => setFormData({...formData, customer: e.target.value})}
                  required
                >
                  <option value="">-- Select Customer --</option>
                  {customers.map(c => (
                    <option key={c._id} value={c._id}>{c.name} ({c.phone})</option>
                  ))}
                </select>
                {customers.length === 0 && (
                  <small style={{ color: 'var(--danger)' }}>
                    No customers found. <Link href="/dashboard/customers" style={{ color: 'var(--brand-blue)', textDecoration: 'underline' }}>Add a customer first →</Link>
                  </small>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: CAR */}
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
                  required
                >
                  <option value="">-- Select Model --</option>
                  {Array.from(new Set(cars.map(c => c.name))).map(modelName => (
                    <option key={modelName} value={modelName}>{modelName}</option>
                  ))}
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
                    required
                  >
                    <option value="">-- Select Variant --</option>
                    {cars.filter(c => c.name === selectedCarModel).map(c => (
                      <option key={c._id} value={c._id}>{c.variant} ({c.fuelType} - {c.transmission}) - ₹{c.exShowroomPrice.toLocaleString('en-IN')}</option>
                    ))}
                  </select>
                </div>
              )}

              {selectedCarDetails && selectedCarDetails.availableColors?.length > 0 && (
                <div className="form-group">
                  <label>Color Options *</label>
                  <select 
                    value={formData.selectedColor} 
                    onChange={e => setFormData({...formData, selectedColor: e.target.value})}
                  >
                    {selectedCarDetails.availableColors.map((color: string, i: number) => (
                      <option key={i} value={color}>{color}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: ACCESSORIES */}
          {step === 3 && (
            <div className="step-content">
              <h3>Step 3: Add Accessories</h3>
              <div className="form-group mt-4">
                <input 
                  type="text" 
                  placeholder="Search accessories by name..." 
                  value={accessorySearch}
                  onChange={(e) => setAccessorySearch(e.target.value)}
                />
              </div>
              <div className="accessories-grid mt-4">
                {accessoriesLookup
                  .filter(acc => !acc.applicableModels || acc.applicableModels.length === 0 || acc.applicableModels.includes(selectedCarModel))
                  .filter(acc => acc.name.toLowerCase().includes(accessorySearch.toLowerCase()))
                  .map(acc => (
                  <label key={acc._id} className="accessory-card">
                    <input 
                      type="checkbox" 
                      checked={formData.accessories.includes(acc._id)}
                      onChange={() => handleAccessoryToggle(acc._id)}
                    />
                    <div className="acc-info">
                      <span className="acc-name">{acc.name}</span>
                      <span className="acc-price">+₹{acc.price.toLocaleString('en-IN')}</span>
                    </div>
                  </label>
                ))}
                {accessoriesLookup
                  .filter(acc => !acc.applicableModels || acc.applicableModels.length === 0 || acc.applicableModels.includes(selectedCarModel))
                  .filter(acc => acc.name.toLowerCase().includes(accessorySearch.toLowerCase())).length === 0 && (
                  <p>No matching accessories found.</p>
                )}
              </div>
            </div>
          )}

          {/* STEP 4: CHARGES & EXCHANGE */}
          {step === 4 && (
            <div className="step-content">
              <h3>Step 4: Charges & Exchange</h3>
              <div className="grid-2 mt-4">
                <div className="form-group">
                  <label>Handling Charges</label>
                  <input type="number" min="0" value={formData.charges.handling} onChange={e => handleChargeChange('handling', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Fastag</label>
                  <input type="number" min="0" value={formData.charges.fastag} onChange={e => handleChargeChange('fastag', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Extended Warranty</label>
                  <input type="number" min="0" value={formData.charges.extendedWarranty} onChange={e => handleChargeChange('extendedWarranty', e.target.value)} />
                </div>
              </div>

              <hr className="my-4" />
              
              <div className="form-group checkbox-group">
                <label>
                  <input type="checkbox" checked={hasExchange} onChange={e => setHasExchange(e.target.checked)} />
                  Customer has a vehicle to exchange
                </label>
              </div>

              {hasExchange && (
                <div className="grid-2 mt-2 bg-light p-4 rounded">
                  <div className="form-group">
                    <label>Old Car Brand/Model</label>
                    <input type="text" value={formData.exchangeVehicle.brand} onChange={e => setFormData({...formData, exchangeVehicle: {...formData.exchangeVehicle, brand: e.target.value}})} placeholder="e.g. Maruti Swift" />
                  </div>
                  <div className="form-group">
                    <label>Expected Exchange Value</label>
                    <input type="number" min="0" value={formData.exchangeVehicle.expectedValue} onChange={e => setFormData({...formData, exchangeVehicle: {...formData.exchangeVehicle, expectedValue: Number(e.target.value)}})} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 5: DISCOUNTS */}
          {step === 5 && (
            <div className="step-content">
              <h3>Step 5: Apply Discounts</h3>
              <p className="subtitle text-danger mb-4">Note: Discounts above standard limits require Manager Approval.</p>
              
              <div className="grid-2">
                <div className="form-group">
                  <label>Dealer Discount</label>
                  <input type="number" min="0" value={formData.discounts.dealer} onChange={e => handleDiscountChange('dealer', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Exchange Bonus</label>
                  <input type="number" min="0" value={formData.discounts.exchangeBonus} onChange={e => handleDiscountChange('exchangeBonus', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Corporate Discount</label>
                  <input type="number" min="0" value={formData.discounts.corporate} onChange={e => handleDiscountChange('corporate', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Festival / Other Offer</label>
                  <input type="number" min="0" value={formData.discounts.festival} onChange={e => handleDiscountChange('festival', e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: REVIEW */}
          {step === 6 && (
            <div className="step-content">
              <h3>Step 6: Review & Submit</h3>
              
              <div className="review-summary mt-4">
                <div className="review-section">
                  <h4>Car Selection</h4>
                  <p>{selectedCarDetails ? `${selectedCarDetails.name} ${selectedCarDetails.variant}` : 'None'} - {formData.selectedColor}</p>
                </div>
                
                <div className="review-section">
                  <h4>Price Breakdown</h4>
                  <table className="summary-table">
                    <tbody>
                      <tr><td>Base Price</td><td className="text-right">₹{totals.basePrice.toLocaleString('en-IN')}</td></tr>
                      <tr><td>GST ({(totals.gstRate * 100).toFixed(0)}%)</td><td className="text-right">₹{totals.gstAmount.toLocaleString('en-IN')}</td></tr>
                      {totals.cessAmount > 0 && <tr><td>Cess ({(totals.cessRate * 100).toFixed(0)}%)</td><td className="text-right">₹{totals.cessAmount.toLocaleString('en-IN')}</td></tr>}
                      <tr><td><strong>Ex-Showroom Price</strong></td><td className="text-right"><strong>₹{totals.exShowroomPrice.toLocaleString('en-IN')}</strong></td></tr>
                      <tr><td>RTO / Registration</td><td className="text-right">₹{totals.rtoAmount.toLocaleString('en-IN')}</td></tr>
                      <tr><td>Insurance</td><td className="text-right">₹{totals.insuranceAmount.toLocaleString('en-IN')}</td></tr>
                      <tr><td>Accessories Total ({formData.accessories.length})</td><td className="text-right">₹{totals.accessoriesTotal.toLocaleString('en-IN')}</td></tr>
                      <tr><td>Other Charges</td><td className="text-right">₹{(totals.handlingCharges + totals.extendedWarranty + totals.fastagCharges).toLocaleString('en-IN')}</td></tr>
                      <tr className="discount"><td>Total Discounts</td><td className="text-right">- ₹{totals.totalDiscount.toLocaleString('en-IN')}</td></tr>
                      {hasExchange && <tr className="discount"><td>Exchange Value</td><td className="text-right">- ₹{totals.exVal.toLocaleString('en-IN')}</td></tr>}
                      <tr className="final-price">
                        <td><strong>Final On-Road Price</strong></td>
                        <td className="text-right"><strong>₹{totals.finalOnRoadPrice.toLocaleString('en-IN')}</strong></td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="action-buttons mt-4">
                  <button className="btn btn-outline" disabled={loading} onClick={() => submitQuotation('Draft')}>
                    Save as Draft
                  </button>
                  <button className="btn btn-primary" disabled={loading} onClick={() => submitQuotation('Pending Approval')}>
                    Submit for Manager Approval
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="wizard-footer">
            <button className="btn btn-outline" onClick={handlePrev} disabled={step === 1 || loading}>Back</button>
            {step < 6 ? (
              <button 
                className="btn btn-primary" 
                onClick={handleNext} 
                disabled={(step === 1 && !formData.customer) || (step === 2 && !formData.car)}
              >
                Next Step
              </button>
            ) : null}
          </div>
        </div>

        {/* Live Preview Sidebar */}
        <div className="preview-card card hidden-mobile">
          <h3>Live Tracking</h3>
          <div className="preview-content">
            <div className="preview-row">
              <span>Ex-Showroom</span>
              <span>₹{totals.exShowroomPrice.toLocaleString('en-IN')}</span>
            </div>
            <div className="preview-row">
              <span>RTO</span>
              <span>₹{totals.rtoAmount.toLocaleString('en-IN')}</span>
            </div>
            <div className="preview-row">
              <span>Insurance</span>
              <span>₹{totals.insuranceAmount.toLocaleString('en-IN')}</span>
            </div>
            <div className="preview-row">
              <span>Accessories</span>
              <span>₹{totals.accessoriesTotal.toLocaleString('en-IN')}</span>
            </div>
            <div className="preview-row">
              <span>Other Charges</span>
              <span>₹{(totals.handlingCharges + totals.extendedWarranty + totals.fastagCharges).toLocaleString('en-IN')}</span>
            </div>
            <div className="preview-row discount">
              <span>Discounts</span>
              <span>-₹{totals.totalDiscount.toLocaleString('en-IN')}</span>
            </div>
            {hasExchange && (
              <div className="preview-row discount">
                <span>Exchange</span>
                <span>-₹{totals.exVal.toLocaleString('en-IN')}</span>
              </div>
            )}
            <hr />
            <div className="preview-row final">
              <span>Final Price</span>
              <span>₹{totals.finalOnRoadPrice.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .builder-page {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-lg);
        }
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .step-indicator {
          background-color: var(--brand-blue-light);
          color: white;
          padding: 0.25rem 0.75rem;
          border-radius: var(--radius-full);
          font-weight: 600;
          font-size: 0.875rem;
        }
        .builder-layout {
          display: grid;
          grid-template-columns: 1fr 300px;
          gap: var(--spacing-lg);
          align-items: start;
        }
        .card {
          background: white;
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-sm);
          border: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
        }
        .wizard-card {
          min-height: 500px;
        }
        .step-content {
          padding: var(--spacing-xl);
          flex: 1;
        }
        .step-content h3 {
          color: var(--brand-blue);
          font-size: 1.25rem;
          margin-bottom: 0.25rem;
        }
        .wizard-footer {
          padding: var(--spacing-lg) var(--spacing-xl);
          border-top: 1px solid var(--border-color);
          display: flex;
          justify-content: space-between;
          background-color: #f9fafb;
          border-bottom-left-radius: var(--radius-md);
          border-bottom-right-radius: var(--radius-md);
        }
        
        .form-group {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
          margin-bottom: var(--spacing-sm);
        }
        .form-group label {
          font-weight: 600;
          font-size: 0.875rem;
          color: var(--text-secondary);
        }
        .form-group input[type="text"], .form-group input[type="number"], .form-group select {
          padding: 0.75rem;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          font-size: 1rem;
        }
        .grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--spacing-md);
        }
        
        /* Accessories Grid */
        .accessories-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: var(--spacing-sm);
        }
        .accessory-card {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all 0.2s;
        }
        .accessory-card:hover {
          background-color: #f0fdf4;
          border-color: #86efac;
        }
        .acc-info {
          display: flex;
          flex-direction: column;
        }
        .acc-name {
          font-weight: 600;
          color: var(--text-primary);
        }
        .acc-price {
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        /* Review Summary */
        .summary-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 1rem;
        }
        .summary-table td {
          padding: 0.75rem 0;
          border-bottom: 1px dashed var(--border-color);
        }
        .text-right { text-align: right; }
        .discount td { color: var(--danger); }
        .final-price td { 
          font-size: 1.25rem; 
          color: var(--brand-blue);
          border-bottom: none;
          padding-top: 1rem;
        }

        /* Live Preview */
        .preview-card {
          position: sticky;
          top: 2rem;
          padding: var(--spacing-lg);
        }
        .preview-card h3 {
          margin-bottom: var(--spacing-lg);
          font-size: 1.125rem;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 0.5rem;
        }
        .preview-content {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .preview-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.875rem;
          color: var(--text-secondary);
        }
        .preview-row.discount { color: var(--danger); }
        .preview-row.final {
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-top: 0.5rem;
        }

        .bg-light { background-color: #f9fafb; }
        .p-4 { padding: 1rem; }
        .rounded { border-radius: 0.5rem; }
        .text-danger { color: #dc2626; }
        .mb-4 { margin-bottom: 1rem; }
        
        .action-buttons {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
        }

        @media (max-width: 768px) {
          .builder-layout {
            grid-template-columns: 1fr;
          }
          .hidden-mobile {
            display: none;
          }
          .grid-2 {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
