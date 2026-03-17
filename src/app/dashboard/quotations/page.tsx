'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Quotation = {
  _id: string;
  quotationNumber: string;
  customer?: { name: string; phone: string };
  car?: { name: string; variant: string };
  salesperson?: { name: string };
  pricing: { finalOnRoadPrice: number };
  status: string;
  createdAt: string;
};

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [historyQuote, setHistoryQuote] = useState<any>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [qRes, uRes] = await Promise.all([
        fetch('/api/quotations'),
        fetch('/api/auth/me')
      ]);
      
      const qData = await qRes.json();
      const uData = await uRes.json();

      if (Array.isArray(qData)) setQuotations(qData);
      if (uData.user) setCurrentUser(uData.user);
    } catch (err) {
      console.error('Failed to fetch data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getStatusClass = (status: string) => {
    switch(status) {
      case 'Approved': return 'status-approved';
      case 'Rejected': return 'status-rejected';
      case 'Pending Approval': return 'status-pending';
      default: return 'status-draft';
    }
  };

  const canEdit = (quote: Quotation) => {
    if (!currentUser) return false;
    const isManager = currentUser.role === 'Manager' || currentUser.role === 'Admin';
    if (quote.status === 'Draft') return true;
    if (quote.status === 'Rejected') return true;
    if (quote.status === 'Approved' && isManager) return true;
    return false;
  };

  return (
    <div className="quotations-page">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {historyQuote && (
            <button className="btn btn-outline btn-sm" onClick={() => setHistoryQuote(null)}>
              &larr; Back
            </button>
          )}
          <h2>{historyQuote ? `History: ${historyQuote.quotationNumber}` : 'Quotations'}</h2>
        </div>
        {!historyQuote && (
          <Link href="/dashboard/quotations/new" className="btn btn-primary">
            + Create Quotation
          </Link>
        )}
      </div>

      {historyQuote && (
        <div className="card history-card">
          <div className="history-list">
            {(!historyQuote.history || historyQuote.history.length === 0) ? (
              <p style={{ textAlign: 'center', padding: '2rem' }}>No changes recorded yet.</p>
            ) : (
              [...historyQuote.history].reverse().map((entry: any, idx: number) => (
                <div key={idx} className="history-entry">
                  <div className="history-entry-header">
                    <span><strong>{entry.changedBy?.name || 'User'}</strong></span>
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

      {!historyQuote && (
      <div className="card table-card">
        {loading ? (
          <p>Loading quotations...</p>
        ) : (
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Quote No.</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Car</th>
                  <th>Status</th>
                  <th>Price</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {quotations.map(quote => (
                  <tr key={quote._id}>
                    <td><strong>{quote.quotationNumber}</strong></td>
                    <td style={{ whiteSpace: 'nowrap' }}>{new Date(quote.createdAt).toLocaleDateString()}</td>
                    <td>{quote.customer?.name || 'N/A'}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{quote.car ? `${quote.car.name} ${quote.car.variant}` : 'N/A'}</td>
                    <td>
                      <span className={`status-badge ${getStatusClass(quote.status)}`}>
                        {quote.status}
                      </span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>₹{quote.pricing?.finalOnRoadPrice?.toLocaleString('en-IN') || 0}</td>
                    <td style={{ display: 'flex', gap: '0.5rem' }}>
                      <Link href={`/dashboard/quotations/${quote._id}`} className="btn btn-sm btn-outline">
                        View
                      </Link>
                      {canEdit(quote) && (
                        <Link href={`/dashboard/quotations/${quote._id}/edit`} className="btn btn-sm btn-outline">
                          Edit
                        </Link>
                      )}
                      <button className="btn btn-sm btn-outline" onClick={() => setHistoryQuote(quote)}>
                        Log
                      </button>
                    </td>
                  </tr>
                ))}
                {quotations.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center' }}>No quotations found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}

      <style jsx>{`
        .quotations-page {
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
        .status-badge {
          padding: 0.25rem 0.5rem;
          border-radius: var(--radius-sm);
          font-size: 0.75rem;
          font-weight: 600;
        }
        .status-approved { background: #dcfce7; color: #166534; }
        .status-rejected { background: #fee2e2; color: #991b1b; }
        .status-pending { background: #fef3c7; color: #92400e; }
        .status-draft { background: #f3f4f6; color: #374151; }
        .table-responsive {
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }
        .history-card { padding: 0; margin-bottom: 2rem; }
        .history-list { display: flex; flex-direction: column; }
        .history-entry { 
          padding: 1.5rem; 
          border-bottom: 1px solid var(--border-color);
        }
        .history-entry:last-child { border-bottom: none; }
        .history-entry-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 1rem;
        }
        .edit-time { 
          font-size: 0.875rem; 
          color: var(--text-secondary);
        }
        .history-changes {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          background: #f9fafb;
          padding: 1rem;
          border-radius: var(--radius-sm);
        }
        .change-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.875rem;
        }
        .field-name { font-weight: 600; color: var(--text-secondary); min-width: 120px; }
        .old-val { color: var(--danger); text-decoration: line-through; }
        .arrow { color: var(--text-secondary); }
        .new-val { color: #166534; font-weight: 600; }

        @media (max-width: 768px) {
          .page-header {
            flex-wrap: wrap;
            gap: 0.75rem;
          }
          .card {
            padding: var(--spacing-md);
          }
          .admin-table th, .admin-table td {
            padding: 0.6rem 0.75rem;
            font-size: 0.8rem;
          }
          .field-name { min-width: 80px; }
        }
      `}</style>
    </div>
  );
}
