'use client';

import { useEffect, useState } from 'react';

type User = {
  _id: string;
  name: string;
  email: string;
  role: string;
  reportsTo?: { _id: string; name: string };
  isActive: boolean;
  createdAt: string;
};

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<string>('');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentUserName, setCurrentUserName] = useState<string>('');
  
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'Sales Associate', reportsTo: '' });
  const [error, setError] = useState('');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/users');
      const data = await res.json();
      if (Array.isArray(data)) {
        setUsers(data);
      }
    } catch (err) {
      console.error('Failed to fetch users', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          const role = data.user.role;
          setCurrentUserRole(role);
          setCurrentUserId(data.user.id);
          setCurrentUserName(data.user.name);
          
          // Set sensible default role for creation
          let defaultRole = 'Sales Associate';
          if (role === 'GM') defaultRole = 'GSM';
          else if (role === 'GSM') defaultRole = 'Sales Manager';
          else if (role === 'Sales Manager') defaultRole = 'Team Lead';
          else if (role === 'Team Lead') defaultRole = 'Sales Associate';
          else if (role === 'Owner') defaultRole = 'GM';
          
          setFormData(prev => ({ ...prev, role: defaultRole, reportsTo: data.user.id }));
        }
      });
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create user');
      }
      setShowForm(false);
      setIsEditMode(false);
      setEditingUserId(null);
      setFormData({ name: '', email: '', password: '', role: 'Sales Associate', reportsTo: '' });
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch(`/api/users/${editingUserId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          role: formData.role,
          reportsTo: formData.reportsTo
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update user');
      }
      setShowForm(false);
      setIsEditMode(false);
      setEditingUserId(null);
      setFormData({ name: '', email: '', password: '', role: 'Sales Associate', reportsTo: '' });
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const startEdit = (user: User) => {
    setEditingUserId(user._id);
    setIsEditMode(true);
    setFormData({
      name: user.name,
      email: user.email,
      password: '', // Password not editable here for simplicity, or add a separate field
      role: user.role,
      reportsTo: user.reportsTo?._id || ''
    });
    setShowForm(true);
  };

  const toggleUserStatus = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus })
      });
      if (res.ok) {
        fetchUsers();
      }
    } catch (err) {
      console.error('Failed to update status', err);
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
          <h2>{showForm ? 'Create New User' : 'User Management'}</h2>
        </div>
        {!showForm && (
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            + Add New User
          </button>
        )}
      </div>

      {showForm && (
        <div className="card form-card">
          <h3>Create New User</h3>
          {error && <div className="error-message">{error}</div>}
          <form onSubmit={handleCreateUser} className="admin-form">
            <div className="form-group">
              <label>Full Name</label>
              <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Email Address</label>
              <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            </div>
            {!isEditMode && (
              <div className="form-group">
                <label>Password</label>
                <input type="password" required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
              </div>
            )}
            <div className="form-group">
              <label>Role</label>
              <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                {currentUserRole === 'Super Admin' && (
                  <>
                    <option value="Super Admin">Super Admin</option>
                    <option value="Admin">Admin</option>
                    <option value="Owner">Owner</option>
                    <option value="GM">General Manager (GM)</option>
                    <option value="GSM">General Sales Manager (GSM)</option>
                    <option value="Sales Manager">Sales Manager</option>
                    <option value="Team Lead">Team Lead</option>
                    <option value="Sales Associate">Sales Associate</option>
                    <option value="F&I Manager">Finance & Insurance (F&I) Manager</option>
                  </>
                )}
                {currentUserRole === 'Admin' && (
                  <>
                    <option value="Admin">Admin</option>
                    <option value="Owner">Owner</option>
                    <option value="GM">General Manager (GM)</option>
                    <option value="GSM">General Sales Manager (GSM)</option>
                    <option value="Sales Manager">Sales Manager</option>
                    <option value="Team Lead">Team Lead</option>
                    <option value="Sales Associate">Sales Associate</option>
                    <option value="F&I Manager">Finance & Insurance (F&I) Manager</option>
                  </>
                )}
                {currentUserRole === 'Owner' && (
                  <>
                    <option value="GM">General Manager (GM)</option>
                    <option value="GSM">General Sales Manager (GSM)</option>
                    <option value="Sales Manager">Sales Manager</option>
                    <option value="Team Lead">Team Lead</option>
                    <option value="Sales Associate">Sales Associate</option>
                    <option value="F&I Manager">Finance & Insurance (F&I) Manager</option>
                  </>
                )}
                {currentUserRole === 'GM' && (
                  <>
                    <option value="GSM">General Sales Manager (GSM)</option>
                    <option value="Sales Manager">Sales Manager</option>
                    <option value="Team Lead">Team Lead</option>
                    <option value="Sales Associate">Sales Associate</option>
                    <option value="F&I Manager">Finance & Insurance (F&I) Manager</option>
                  </>
                )}
                {currentUserRole === 'GSM' && (
                  <>
                    <option value="Sales Manager">Sales Manager</option>
                    <option value="Team Lead">Team Lead</option>
                    <option value="Sales Associate">Sales Associate</option>
                    <option value="F&I Manager">Finance & Insurance (F&I) Manager</option>
                  </>
                )}
                {currentUserRole === 'Sales Manager' && (
                  <>
                    <option value="Team Lead">Team Lead</option>
                    <option value="Sales Associate">Sales Associate</option>
                  </>
                )}
                {currentUserRole === 'Team Lead' && <option value="Sales Associate">Sales Associate</option>}
              </select>
            </div>
            {['Super Admin', 'Admin', 'Owner', 'GM', 'GSM', 'Sales Manager', 'Team Lead'].includes(currentUserRole) && (
              <div className="form-group">
                <label>Reports To (Manager/Lead)</label>
                <select 
                  value={formData.reportsTo || ''} 
                  onChange={e => setFormData({...formData, reportsTo: e.target.value})}
                >
                  <option value="">None (Self Managed / Top Level)</option>
                  
                  {/* Option for current user as the reportsTo parent */}
                  <option value={currentUserId}>Self ({currentUserName || 'You'})</option>

                  {/* Options for other managers in the hierarchy */}
                  {users.filter(u => {
                    const r = formData.role;
                    if (r === 'Sales Associate') return ['Team Lead', 'Sales Manager', 'GSM', 'GM'].includes(u.role);
                    if (r === 'Team Lead') return ['Sales Manager', 'GSM', 'GM'].includes(u.role);
                    if (r === 'Sales Manager') return ['GSM', 'GM'].includes(u.role);
                    if (r === 'GSM') return ['GM'].includes(u.role);
                    if (r === 'GM') return ['Owner', 'Admin', 'Super Admin'].includes(u.role);
                    return false;
                  }).map(u => (
                    <option key={u._id} value={u._id}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </div>
            )}
            <div className="form-actions">
              <button 
                type="submit" 
                className="btn btn-primary"
                onClick={isEditMode ? handleUpdateUser : handleCreateUser}
              >
                {isEditMode ? 'Update User' : 'Create User'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card table-card">
        {loading ? (
          <p>Loading users...</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user._id}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>
                    <span className={`role-badge role-${user.role.toLowerCase().replace(' ', '-')}`}>{user.role}</span>
                    {user.reportsTo && <div style={{ fontSize: '0.7rem', color: '#666', marginTop: '2px' }}>Reports to: {user.reportsTo.name}</div>}
                  </td>
                  <td>
                    <span className={`status-badge ${user.isActive ? 'active' : 'inactive'}`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        className="btn btn-sm btn-outline"
                        onClick={() => startEdit(user)}
                      >
                        Edit
                      </button>
                      <button 
                        className="btn btn-sm btn-outline"
                        onClick={() => toggleUserStatus(user._id, user.isActive)}
                      >
                        {user.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center' }}>No users found.</td>
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
        .role-badge {
          padding: 0.25rem 0.5rem;
          border-radius: var(--radius-sm);
          font-size: 0.75rem;
          font-weight: 600;
        }
        .role-owner { background: #4c1d95; color: white; }
        .role-gm { background: #1e3a8a; color: white; }
        .role-gsm { background: #1e40af; color: white; }
        .role-sales-manager { background: #3b82f6; color: white; }
        .role-f-i-manager { background: #6366f1; color: white; }
        .role-sales-associate { background: #94a3b8; color: white; }
        .role-admin { background: #dc2626; color: white; }
        .role-super-admin { background: #991b1b; color: white; }
        
        .status-badge {
          padding: 0.25rem 0.5rem;
          border-radius: var(--radius-sm);
          font-size: 0.75rem;
          font-weight: 600;
        }
        .status-badge.active { background: #dcfce7; color: #166534; }
        .status-badge.inactive { background: #f3f4f6; color: #374151; }
        
        .error-message {
          color: var(--danger);
          background-color: #fef2f2;
          padding: 0.75rem;
          border-radius: var(--radius-sm);
          margin-bottom: var(--spacing-md);
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  );
}
