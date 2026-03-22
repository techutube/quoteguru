'use client';

import { useEffect, useState } from 'react';

type Car = {
  _id: string;
  name: string;
  variant: string;
  fuelType: string;
  transmission: string;
  exShowroomPrice: number;
  availableColors: string[];
  category: string;
};

export default function CarInventoryPage() {
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: 'Nexon',
    variant: 'XZ+',
    fuelType: 'Petrol',
    transmission: 'Manual',
    exShowroomPrice: 1000000,
    availableColors: 'White, Red, Daytona Grey',
    category: 'SUV'
  });
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState('');

  const fetchCars = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/cars');
      const data = await res.json();
      if (Array.isArray(data)) {
        setCars(data);
      }
    } catch (err) {
      console.error('Failed to fetch cars', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCars();
  }, []);

  const handleCreateCar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const colorsArray = formData.availableColors.split(',').map(c => c.trim()).filter(c => c);
      const res = await fetch('/api/cars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, availableColors: colorsArray })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to add car');
      }
      setShowForm(false);
      setFormData({
        name: '', variant: '', fuelType: 'Petrol', transmission: 'Manual',
        exShowroomPrice: 0, availableColors: '', category: 'Hatchback'
      });
      fetchCars();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError('');
    setUploadSuccess('');

    const fd = new FormData();
    for (let i = 0; i < files.length; i++) {
      fd.append('file', files[i]);
    }

    try {
      const res = await fetch('/api/cars/upload', {
        method: 'POST',
        body: fd
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload CSV');
      }
      
      setUploadSuccess(data.message);
      if (data.errors && data.errors.length > 0) {
        setError(`Some rows had issues: \n${data.errors.join('\n')}`);
      }
      fetchCars();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
      // Reset input
      if (e.target) e.target.value = '';
    }
  };

  const downloadTemplate = () => {
    const headers = "Model Name, Variant, Category, Fuel Type, Transmission, ExShowroom Price, Available Colors, Length, Engine CC, isSUV\n";
    const sample = "Nexon, XZA+, SUV, Petrol, AMT, 1250000, \"White, Grey\", 4.0, 1200, true\n";
    const blob = new Blob([headers + sample], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Car_Upload_Template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
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
          <h2>{showForm ? 'Add New Car Model' : 'Car Inventory Management'}</h2>
        </div>
        {!showForm && (
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn btn-outline" onClick={downloadTemplate}>
              📥 Download CSV Template
            </button>
            <label className="btn btn-outline" style={{ cursor: 'pointer', margin: 0 }}>
              {uploading ? 'Uploading...' : '⬆️ Bulk Upload CSV'}
              <input type="file" accept=".csv" multiple onChange={handleFileUpload} style={{ display: 'none' }} disabled={uploading}/>
            </label>
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>
              + Add New Car
            </button>
          </div>
        )}
      </div>

      {uploadSuccess && <div className="success-message">{uploadSuccess}</div>}
      {error && <div className="error-message" style={{ whiteSpace: 'pre-line' }}>{error}</div>}

      {showForm && (
        <div className="card form-card">
          <h3>Add New Car Model</h3>
          <form onSubmit={handleCreateCar} className="admin-form">
            <div className="form-group">
              <label>Model Name</label>
              <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Harrier" />
            </div>
            <div className="form-group">
              <label>Variant</label>
              <input type="text" required value={formData.variant} onChange={e => setFormData({...formData, variant: e.target.value})} placeholder="e.g. XZA+" />
            </div>
            <div className="form-group">
              <label>Category</label>
              <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                <option value="Hatchback">Hatchback</option>
                <option value="Sedan">Sedan</option>
                <option value="SUV">SUV</option>
                <option value="EV">EV</option>
              </select>
            </div>
            <div className="form-group">
              <label>Fuel Type</label>
              <select value={formData.fuelType} onChange={e => setFormData({...formData, fuelType: e.target.value})}>
                <option value="Petrol">Petrol</option>
                <option value="Diesel">Diesel</option>
                <option value="EV">EV</option>
                <option value="CNG">CNG</option>
              </select>
            </div>
            <div className="form-group">
              <label>Transmission</label>
              <select value={formData.transmission} onChange={e => setFormData({...formData, transmission: e.target.value})}>
                <option value="Manual">Manual</option>
                <option value="Automatic">Automatic</option>
                <option value="AMT">AMT</option>
                <option value="DCA">DCA</option>
              </select>
            </div>
            <div className="form-group">
              <label>Ex-Showroom Price (₹)</label>
              <input type="number" required min="0" value={formData.exShowroomPrice} onChange={e => setFormData({...formData, exShowroomPrice: Number(e.target.value)})} />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Available Colors (comma separated)</label>
              <input type="text" value={formData.availableColors} onChange={e => setFormData({...formData, availableColors: e.target.value})} placeholder="e.g. Orcus White, Calypso Red" />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">Save Car</button>
            </div>
          </form>
        </div>
      )}

      <div className="card table-card">
        {loading ? (
          <p>Loading inventory...</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Model</th>
                <th>Variant</th>
                <th>Category</th>
                <th>Powertrain</th>
                <th>Ex-Showroom</th>
                <th>Colors Count</th>
              </tr>
            </thead>
            <tbody>
              {cars.map(car => (
                <tr key={car._id}>
                  <td><strong>{car.name}</strong></td>
                  <td>{car.variant}</td>
                  <td>{car.category}</td>
                  <td>{car.fuelType} - {car.transmission}</td>
                  <td>₹{car.exShowroomPrice.toLocaleString('en-IN')}</td>
                  <td>{car.availableColors?.length || 0}</td>
                </tr>
              ))}
              {cars.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center' }}>No cars in inventory.</td>
                </tr>
              )}
            </tbody>
          </table>
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
        .success-message {
          color: #059669;
          background-color: #ecfdf5;
          padding: 0.75rem;
          border-radius: var(--radius-sm);
          margin-bottom: var(--spacing-md);
          font-size: 0.875rem;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}
