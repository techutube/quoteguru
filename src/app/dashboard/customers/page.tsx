'use client';

import { useEffect, useState } from 'react';

type Customer = {
  _id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  createdAt: string;
};

export default function CustomerManagementPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', address: '', city: '', state: '' });
  const [error, setError] = useState('');

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

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create customer');
      }
      setShowForm(false);
      setFormData({ name: '', phone: '', email: '', address: '', city: '', state: '' });
      fetchCustomers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="admin-page">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {showForm && (
            <button className="btn btn-outline btn-sm" onClick={() => setShowForm(false)}>
              &larr; Back
            </button>
          )}
          <h2>{showForm ? 'Add New Customer' : 'Customer Management'}</h2>
        </div>
        {!showForm && (
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            + Add New Customer
          </button>
        )}
      </div>

      {showForm && (
        <div className="card form-card">
          <h3>Register Customer</h3>
          {error && <div className="error-message">{error}</div>}
          <form onSubmit={handleCreateCustomer} className="admin-form">
            <div className="form-group">
              <label>Full Name *</label>
              <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Rahul Sharma" />
            </div>
            <div className="form-group">
              <label>Phone Number *</label>
              <input type="tel" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="e.g. 9876543210" />
            </div>
            <div className="form-group">
              <label>Email Address</label>
              <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="Optional" />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Address</label>
              <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="Street address" />
            </div>
            <div className="form-group">
              <label>City</label>
              <input type="text" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} placeholder="e.g. Mumbai" />
            </div>
            <div className="form-group">
              <label>State</label>
              <input type="text" value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} placeholder="e.g. Maharashtra" />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">Save Customer</button>
            </div>
          </form>
        </div>
      )}

      <div className="card table-card">
        {loading ? (
          <p>Loading customers...</p>
        ) : (
          <div className="table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>City</th>
                <th>Registered On</th>
              </tr>
            </thead>
            <tbody>
              {customers.map(cust => (
                <tr key={cust._id}>
                  <td><strong>{cust.name}</strong></td>
                  <td>{cust.phone}</td>
                  <td>{cust.email || '-'}</td>
                  <td>{cust.city || '-'}</td>
                  <td>{new Date(cust.createdAt).toLocaleDateString()}</td>
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
        .form-card h3 {
          margin-bottom: var(--spacing-md);
          color: var(--brand-blue);
        }
        .admin-form {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--spacing-md);
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
        }
        .form-group label {
          font-weight: 600;
          font-size: 0.875rem;
          color: var(--text-secondary);
        }
        .form-group input, .form-group select {
          padding: 0.75rem;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
        }
        .form-group input:focus, .form-group select:focus {
          border-color: var(--brand-blue);
          outline: none;
        }
        .form-actions {
          grid-column: 1 / -1;
          display: flex;
          justify-content: flex-end;
          margin-top: var(--spacing-sm);
        }
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
        .table-responsive {
          width: 100%;
          overflow-x: auto;
        }
        @media (max-width: 768px) {
          .admin-form {
            grid-template-columns: 1fr;
          }
          .page-header {
            flex-wrap: wrap;
            gap: 0.75rem;
          }
          .admin-table th, .admin-table td {
            padding: 0.6rem;
            font-size: 0.85rem;
          }
        }
      `}</style>
    </div>
  );
}
