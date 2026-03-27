'use client';

import { useEffect, useState } from 'react';

const CUSTOMER_TITLES = ['Mr.', 'Captain', 'Major', 'Col.', 'Lt. Col.', 'Prof.', 'Lieutenant', 'Lt. General', 'Major General', 'Pandit', 'Smt.', 'Shri.', 'Wing Commandar', 'Flight Lieutenant', 'Commander', 'Air Marshal', 'Brigadier', 'Sqdn Leader', 'Air V Marshal', 'Judge', 'Others'];
const RELATION_TYPES = ['S/o', 'W/o', 'D/o', 'C/o'];
const SEGMENTS = ['Individual', 'Corporate'];
const INDIAN_STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", 
  "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli", "Daman and Diu", "Delhi", 
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", 
  "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", 
  "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", 
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", 
  "Uttarakhand", "West Bengal"
];

type Customer = {
  _id: string;
  title?: string;
  name: string;
  relationType?: string;
  relationName?: string;
  segment?: string;
  enquirySource?: string;
  gstCategory?: string;
  coDealer?: string;
  phone: string;
  phoneO?: string;
  phoneR?: string;
  email?: string;
  address?: string;
  placeOfSupply?: string;
  state?: string;
  city?: string;
  pinCode?: string;
  locality?: string;
  dob?: string;
  doa?: string;
  pan?: string;
  gstin?: string;
  aadhaar?: string;
  tin?: string;
  nominee?: {
    name?: string;
    dob?: string;
    relation?: string;
    reference?: string;
  };
  lsPoNo?: string;
  lsPoDate?: string;
  tan?: string;
  accountGroup?: string;
  groupCode?: string;
  groupName?: string;
  history?: Array<{
    changedBy?: { name: string };
    at: string;
    changes: Record<string, { from: any; to: any }>;
  }>;
  createdAt: string;
};

const initialForm = {
  title: 'Mr.', name: '', relationType: '', relationName: '', segment: 'Individual',
  enquirySource: '', gstCategory: '', coDealer: '',
  phone: '', phoneO: '', phoneR: '', email: '',
  address: '', placeOfSupply: '', state: '', city: '', pinCode: '', locality: '',
  dob: '', doa: '', pan: '', gstin: '', aadhaar: '', tin: '',
  nominee: { name: '', dob: '', relation: '', reference: '' },
  lsPoNo: '', lsPoDate: '', tan: '', accountGroup: '', groupCode: '', groupName: ''
};

export default function CustomerManagementPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({ ...initialForm });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [historyCust, setHistoryCust] = useState<Customer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/customers');
      const data = await res.json();
      if (Array.isArray(data)) {
        setCustomers(data);
      }
    } catch (err) {
      console.error('Failed to fetch customers', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery) ||
    (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleEditClick = (cust: Customer) => {
    setEditingId(cust._id);
    setFormData({
      ...initialForm,
      ...cust,
      dob: cust.dob ? new Date(cust.dob).toISOString().split('T')[0] : '',
      doa: cust.doa ? new Date(cust.doa).toISOString().split('T')[0] : '',
      lsPoDate: cust.lsPoDate ? new Date(cust.lsPoDate).toISOString().split('T')[0] : '',
      nominee: {
        ...initialForm.nominee,
        ...cust.nominee,
        dob: cust.nominee?.dob ? new Date(cust.nominee.dob).toISOString().split('T')[0] : ''
      }
    });
    setHistoryCust(null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({ ...initialForm });
    setShowForm(false);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    const url = editingId ? `/api/customers/${editingId}` : '/api/customers';
    const method = editingId ? 'PUT' : 'POST';

    // Cleanup empty strings for clean db
    const payload = JSON.parse(JSON.stringify(formData));
    Object.keys(payload).forEach(key => {
      if (payload[key] === '') delete payload[key];
    });

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Failed to ${editingId ? 'update' : 'create'} customer`);
      }
      
      setSuccess(`Customer ${editingId ? 'updated' : 'registered'} successfully!`);
      setTimeout(() => setSuccess(''), 3000);
      
      setShowForm(false);
      setEditingId(null);
      setFormData({ ...initialForm });
      fetchCustomers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="admin-page">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {(showForm || editingId || historyCust) && (
            <button className="btn btn-outline btn-sm" onClick={() => { setHistoryCust(null); handleCancelEdit(); }}>
              &larr; Back
            </button>
          )}
          <h2>{historyCust ? `Change History: ${historyCust.name}` : editingId ? 'Edit Customer' : showForm ? 'Add New Customer' : 'Customer Management'}</h2>
        </div>
        {!showForm && !editingId && !historyCust && (
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div className="search-box">
              <input 
                type="text" 
                placeholder="Search customers..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>
              + Add New Customer
            </button>
          </div>
        )}
      </div>

      {showForm && !historyCust && (
        <div className="card form-card" style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h3>{editingId ? 'Update Customer Details' : 'Register Customer'}</h3>
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}
          
          <form onSubmit={handleSubmit} className="dealership-form">
            <div className="form-section">
              <h4 className="section-title">Customer Details</h4>
              <div className="form-grid">
                
                <div className="form-group row-group">
                  <label>Segment</label>
                  <select value={formData.segment} onChange={e => setFormData({...formData, segment: e.target.value})}>
                    {SEGMENTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className="form-group row-group">
                  <label>Enquiry Source</label>
                  <select value={formData.enquirySource} onChange={e => setFormData({...formData, enquirySource: e.target.value})}>
                    <option value="">--SELECT--</option>
                    <option value="Walk-in">Walk-in</option>
                    <option value="Web">Web</option>
                    <option value="Phone">Phone</option>
                    <option value="Reference">Reference</option>
                  </select>
                </div>

                <div className="form-group row-group">
                  <label>GST Category</label>
                  <select value={formData.gstCategory} onChange={e => setFormData({...formData, gstCategory: e.target.value})}>
                    <option value="">--SELECT--</option>
                    <option value="Unregistered">Unregistered</option>
                    <option value="Registered">Registered</option>
                  </select>
                </div>

                <div className="form-group row-group">
                  <label>Co Dealer</label>
                  <input type="text" value={formData.coDealer} onChange={e => setFormData({...formData, coDealer: e.target.value})} placeholder="Optional" />
                </div>

                <div className="form-group row-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Customer Name *</label>
                  <div className="multi-input">
                    {formData.segment !== 'Corporate' && (
                      <select style={{ width: '100px' }} value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}>
                        {CUSTOMER_TITLES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    )}
                    <input type="text" style={{ flex: 1 }} required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Company or Individual Name" />
                  </div>
                </div>

                {formData.segment !== 'Corporate' && (
                  <div className="form-group row-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Relation</label>
                    <div className="multi-input">
                      <select style={{ width: '100px' }} value={formData.relationType} onChange={e => setFormData({...formData, relationType: e.target.value})}>
                        <option value="">--Select--</option>
                        {RELATION_TYPES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                      <input type="text" style={{ flex: 1 }} value={formData.relationName} onChange={e => setFormData({...formData, relationName: e.target.value})} placeholder="Relative's Name" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="form-section">
              <h4 className="section-title">Billing Address</h4>
              <div className="form-grid">
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <textarea rows={2} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="Full Street Address..."></textarea>
                </div>

                <div className="form-group row-group">
                  <label>Place Of Supply</label>
                  <input type="text" value={formData.placeOfSupply} onChange={e => setFormData({...formData, placeOfSupply: e.target.value})} placeholder="e.g. Prayagraj" />
                </div>
                <div className="form-group row-group">
                  <label>State</label>
                  <select value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})}>
                    <option value="">--SELECT--</option>
                    {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group row-group">
                  <label>City</label>
                  <input type="text" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} placeholder="City" />
                </div>
                <div className="form-group row-group">
                  <label>Locality</label>
                  <input type="text" value={formData.locality} onChange={e => setFormData({...formData, locality: e.target.value})} placeholder="Locality or Region" />
                </div>
                <div className="form-group row-group">
                  <label>Pin Code</label>
                  <input type="text" value={formData.pinCode} onChange={e => setFormData({...formData, pinCode: e.target.value})} placeholder="XXXXXX" />
                </div>
              </div>
            </div>

            <div className="form-section flex-row-desktop">
              <div className="half-col">
                <h4 className="section-title">Contact & Demographics</h4>
                <div className="form-grid one-col">
                  <div className="form-group row-group">
                    <label>Mobile Number *</label>
                    <input type="tel" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="9876543210" />
                  </div>
                  <div className="form-group row-group">
                    <label>Phone(O)</label>
                    <input type="tel" value={formData.phoneO} onChange={e => setFormData({...formData, phoneO: e.target.value})} />
                  </div>
                  <div className="form-group row-group">
                    <label>Phone(R)</label>
                    <input type="tel" value={formData.phoneR} onChange={e => setFormData({...formData, phoneR: e.target.value})} />
                  </div>
                  <div className="form-group row-group">
                    <label>Email ID</label>
                    <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                  </div>
                  
                  <div className="form-group row-group">
                    <label>D.O.B</label>
                    <input type="date" value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} />
                  </div>
                  <div className="form-group row-group">
                    <label>D.O.A</label>
                    <input type="date" value={formData.doa} onChange={e => setFormData({...formData, doa: e.target.value})} />
                  </div>
                </div>
              </div>

              <div className="half-col">
                <h4 className="section-title">Identifications</h4>
                <div className="form-grid one-col">
                  <div className="form-group row-group">
                    <label>PAN/Form 60</label>
                    <input type="text" value={formData.pan} onChange={e => setFormData({...formData, pan: e.target.value})} placeholder="ABCDE1234F" />
                  </div>
                  <div className="form-group row-group">
                    <label>GSTIN</label>
                    <input type="text" value={formData.gstin} onChange={e => setFormData({...formData, gstin: e.target.value})} placeholder="22AAAAA0000A1Z5" />
                  </div>
                  <div className="form-group row-group">
                    <label>Aadhaar No</label>
                    <input type="text" value={formData.aadhaar} onChange={e => setFormData({...formData, aadhaar: e.target.value})} placeholder="123456789012" />
                  </div>
                  <div className="form-group row-group">
                    <label>TIN</label>
                    <input type="text" value={formData.tin} onChange={e => setFormData({...formData, tin: e.target.value})} />
                  </div>
                </div>
              </div>
            </div>

            <div className="form-section">
              <h4 className="section-title line-through"><span className="bg-white px-2">Nominee Details</span></h4>
              <div className="form-grid">
                <div className="form-group row-group">
                  <label>Nominee Name</label>
                  <input type="text" value={formData.nominee.name} onChange={e => setFormData({...formData, nominee: { ...formData.nominee, name: e.target.value }})} />
                </div>
                <div className="form-group row-group">
                  <label>Nominee DOB</label>
                  <input type="date" value={formData.nominee.dob} onChange={e => setFormData({...formData, nominee: { ...formData.nominee, dob: e.target.value }})} />
                </div>
                <div className="form-group row-group">
                  <label>Nominee Relation</label>
                  <select value={formData.nominee.relation} onChange={e => setFormData({...formData, nominee: { ...formData.nominee, relation: e.target.value }})}>
                    <option value="">--SELECT--</option>
                    <option value="Spouse">Spouse</option>
                    <option value="Son">Son</option>
                    <option value="Daughter">Daughter</option>
                    <option value="Father">Father</option>
                    <option value="Mother">Mother</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="form-group row-group">
                  <label>Reference</label>
                  <input type="text" value={formData.nominee.reference} onChange={e => setFormData({...formData, nominee: { ...formData.nominee, reference: e.target.value }})} />
                </div>
              </div>
            </div>

            <div className="form-section">
              <div className="form-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                <div className="form-group row-group">
                  <label>LS / PO No</label>
                  <input type="text" value={formData.lsPoNo} onChange={e => setFormData({...formData, lsPoNo: e.target.value})} />
                </div>
                <div className="form-group row-group">
                  <label>LS / PO Date</label>
                  <input type="date" value={formData.lsPoDate} onChange={e => setFormData({...formData, lsPoDate: e.target.value})} />
                </div>
                <div className="form-group row-group">
                  <label>TAN</label>
                  <input type="text" value={formData.tan} onChange={e => setFormData({...formData, tan: e.target.value})} />
                </div>
                <div className="form-group row-group" style={{ gridColumn: '1/-1' }}>
                  {/* Divider implicitly handled above */}
                </div>
                <div className="form-group row-group">
                  <label>Account Group</label>
                  <select value={formData.accountGroup} onChange={e => setFormData({...formData, accountGroup: e.target.value})}>
                    <option value="">Select</option>
                    <option value="Trade">Trade</option>
                    <option value="Non-Trade">Non-Trade</option>
                  </select>
                </div>
                <div className="form-group row-group">
                  <label>Group Code</label>
                  <input type="text" value={formData.groupCode} onChange={e => setFormData({...formData, groupCode: e.target.value})} />
                </div>
                <div className="form-group row-group" style={{ gridColumn: 'span 2' }}>
                  <label>Group Name</label>
                  <input type="text" value={formData.groupName} onChange={e => setFormData({...formData, groupName: e.target.value})} />
                </div>
              </div>
            </div>

            <div className="form-actions form-footer">
              {editingId && (
                <button type="button" className="btn btn-outline" onClick={handleCancelEdit}>Cancel</button>
              )}
              <button type="submit" className="btn btn-primary" style={{ minWidth: '200px', fontSize: '1rem', padding: '0.75rem' }}>
                {editingId ? 'Update Customer Record' : 'Save Customer Record'}
              </button>
            </div>
          </form>
        </div>
      )}

      {historyCust && (
        <div className="card history-card">
          <div className="history-list">
            {(!historyCust.history || historyCust.history.length === 0) ? (
              <p style={{ textAlign: 'center', padding: '2rem' }}>No changes recorded yet.</p>
            ) : (
              historyCust.history.map((entry: any, idx: number) => (
                <div key={idx} className="history-entry">
                  <div className="history-entry-header">
                    <span className="editor-name"><strong>{entry.changedBy?.name || 'System User'}</strong></span>
                    <span className="edit-time">{new Date(entry.at).toLocaleString()}</span>
                  </div>
                  <div className="history-changes">
                    {Object.entries(entry.changes || {}).map(([field, delta]: [any, any]) => (
                      <div key={field} className="change-item">
                        <span className="field-name">{field}:</span>
                        <span className="old-val">{String(delta.from || 'none')}</span>
                        <span className="arrow">&rarr;</span>
                        <span className="new-val">{String(delta.to || 'none')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {!historyCust && !showForm && (
      <div className="card table-card">
        {loading ? (
          <p>Loading customers...</p>
        ) : (
          <div className="table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name / Segment</th>
                <th>Mobile / Email</th>
                <th>Location</th>
                <th>IDs Info</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map(cust => (
                <tr key={cust._id}>
                  <td>
                    <strong>{cust.title ? cust.title + ' ' : ''}{cust.name}</strong><br/>
                    <small style={{ color: 'var(--text-secondary)' }}>{cust.segment}</small>
                  </td>
                  <td>
                    {cust.phone}<br/>
                    <small style={{ color: 'var(--text-secondary)' }}>{cust.email || '-'}</small>
                  </td>
                  <td>
                    {cust.city || cust.placeOfSupply || '-'}<br/>
                    <small style={{ color: 'var(--text-secondary)' }}>{cust.state || ''}</small>
                  </td>
                  <td>
                    <small>PAN: {cust.pan || '-'}</small><br/>
                    <small>Aadhaar: {cust.aadhaar || '-'}</small>
                  </td>
                  <td style={{ display: 'flex', gap: '0.5rem', paddingTop: '1.5rem' }}>
                    <button 
                      className="btn btn-sm btn-outline" 
                      onClick={() => handleEditClick(cust)}
                    >
                      Edit
                    </button>
                    <button 
                      className="btn btn-sm btn-outline" 
                      onClick={() => setHistoryCust(cust)}
                    >
                      History
                    </button>
                  </td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center' }}>No customers registered yet.</td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        )}
      </div>
      )}


      <style jsx>{`
        .admin-page {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-lg);
        }
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .page-header h2 {
          color: var(--text-primary);
          font-weight: 700;
        }
        .card {
          background: white;
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-sm);
          padding: var(--spacing-lg);
          border: 1px solid var(--border-color);
        }
        .dealership-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          background-color: #fcfdfd;
          border: 1px solid var(--border-color);
          padding: 2rem;
          border-radius: var(--radius-md);
        }
        .form-section {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .section-title {
          font-size: 1rem;
          color: #1e3a8a;
          border-bottom: 2px solid #e2e8f0;
          padding-bottom: 0.5rem;
          margin-bottom: 0.5rem;
          font-weight: 600;
        }
        .line-through {
           position: relative;
           text-align: center;
           border-bottom: none;
           padding-bottom: 0;
           z-index: 1;
        }
        .line-through::before {
           content: "";
           position: absolute;
           top: 50%;
           left: 0;
           right: 0;
           border-top: 2px solid #e2e8f0;
           z-index: -1;
        }
        .bg-white { background: #fcfdfd; }
        .px-2 { padding: 0 0.5rem; }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem 1.5rem;
        }
        .one-col {
          grid-template-columns: 1fr !important;
        }
        .flex-row-desktop {
          display: flex;
          gap: 2rem;
        }
        .half-col {
          flex: 1;
        }

        .row-group {
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 0.5rem;
        }
        .row-group label {
          color: #1e3a8a;
          font-size: 0.85rem;
          font-weight: 500;
          flex: 0 0 110px;
          text-align: right;
        }
        
        .form-group input, .form-group select, .form-group textarea {
          flex: 1;
          padding: 0.5rem 0.6rem;
          border: 1px solid var(--border-color);
          border-radius: 4px;
          font-size: 0.875rem;
          background: white;
          width: 100%;
        }
        .form-group input:focus, .form-group select:focus, .form-group textarea:focus {
          border-color: #1e3a8a;
          outline: none;
          box-shadow: 0 0 0 2px rgba(30, 58, 138, 0.1);
        }
        
        .multi-input {
          display: flex;
          gap: 0.5rem;
          flex: 1;
        }

        .form-footer {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid var(--border-color);
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
        }

        /* Legacy styles */
        .admin-table {
          width: 100%;
          border-collapse: collapse;
        }
        .admin-table th, .admin-table td {
          padding: 1rem;
          text-align: left;
          border-bottom: 1px solid var(--border-color);
        }
        .admin-table th {
          font-weight: 600;
          color: var(--text-secondary);
          background-color: var(--bg-color);
        }
        .error-message {
          color: var(--danger);
          background-color: #fef2f2;
          padding: 0.75rem;
          border-radius: var(--radius-sm);
          margin-bottom: var(--spacing-md);
          font-size: 0.875rem;
        }
        .success-message {
          color: white;
          background-color: #166534;
          padding: 0.75rem;
          border-radius: var(--radius-sm);
          margin-bottom: var(--spacing-md);
          font-size: 0.875rem;
          text-align: center;
        }
        .search-input {
          padding: 0.6rem 1rem;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          font-size: 0.875rem;
          width: 250px;
          outline: none;
        }

        @media (max-width: 768px) {
          .flex-row-desktop {
            flex-direction: column;
          }
          .row-group {
            flex-direction: column;
            align-items: flex-start;
          }
          .row-group label {
            text-align: left;
            flex: unset;
          }
        }
      `}</style>
    </div>
  );
}
