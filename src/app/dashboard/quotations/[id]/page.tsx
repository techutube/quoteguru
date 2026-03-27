'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function QuotationViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [quotation, setQuotation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState('');
  const [emailError, setEmailError] = useState('');

  useEffect(() => {
    fetch(`/api/quotations/${id}`)
      .then(res => res.json())
      .then(data => {
        setQuotation(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [id]);

  const generatePDF = () => {
    const input = document.getElementById('pdf-content');
    if (!input) return;

    html2canvas(input, { scale: 2 }).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${quotation.quotationNumber}.pdf`);
    });
  };

  const emailPDF = async () => {
    const targetEmail = prompt('Enter recipient email:', quotation?.customer?.email || '');
    if (!targetEmail) return;

    setSendingEmail(true);
    setEmailError('');
    setEmailSuccess('');

    const input = document.getElementById('pdf-content');
    if (!input) {
      setSendingEmail(false);
      return;
    }

    try {
      const canvas = await html2canvas(input, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      const pdfBaseURL = pdf.output('datauristring');

      const res = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: targetEmail,
          subject: `Your Dealership Quotation: ${quotation.quotationNumber}`,
          body: `Dear ${quotation.customer?.name || 'Customer'},\n\nPlease find the requested vehicle quotation attached.\n\nThank you,\nQuoteGuru Dealership`,
          pdfBase64: pdfBaseURL,
          filename: `Quotation_${quotation.quotationNumber}.pdf`
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send email');

      setEmailSuccess('Quotation sent successfully!');
      setTimeout(() => setEmailSuccess(''), 4000);
    } catch (err: any) {
      console.error(err);
      setEmailError(err.message || 'Error generating/sending PDF');
    } finally {
      setSendingEmail(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading quotation document...</div>;
  if (!quotation) return <div className="p-8 text-center">Quotation not found.</div>;

  return (
    <div className="view-page">
      <div className="actions-bar">
        <Link href="/dashboard/quotations" className="btn btn-outline btn-sm">← Back to List</Link>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {emailSuccess && <span style={{ color: 'green', fontSize: '13px', fontWeight: 'bold' }}>{emailSuccess}</span>}
          {emailError && <span style={{ color: 'red', fontSize: '13px', fontWeight: 'bold' }}>{emailError}</span>}
          <button className="btn btn-outline" onClick={emailPDF} disabled={sendingEmail}>
            {sendingEmail ? 'Sending...' : '📧 Email PDF'}
          </button>
          <button className="btn btn-primary" onClick={generatePDF}>📄 Download PDF</button>
        </div>
      </div>

      <div className="pdf-container">
        {/* The section we will capture for PDF */}
        <div id="pdf-content" className="pdf-document">
          <div className="doc-header">
            <div className="dealer-info">
              <h1>QuoteGuru</h1>
              <p>Authorized Dealership Central</p>
              <p>Main Road, City Center - 400001</p>
              <p>Ph: +91 1800 209 7979</p>
            </div>
            <div className="doc-meta">
              <h2>PROFORMA QUOTATION</h2>
              <table className="meta-table">
                <tbody>
                  <tr><td>Quote No:</td><td><strong>{quotation.quotationNumber}</strong></td></tr>
                  <tr><td>Date:</td><td>{new Date(quotation.createdAt).toLocaleDateString()}</td></tr>
                  <tr><td>Status:</td><td>{quotation.status}</td></tr>
                  <tr><td>Sales Rep:</td><td>{quotation.salesperson?.name || 'Assigned Agent'}</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="info-grid">
            <div className="customer-info doc-section">
              <h3>Customer Details</h3>
              <p><strong>Name:</strong> {quotation.customer?.name}</p>
              {quotation.enquiryDetails?.relation && quotation.enquiryDetails?.relationName && (
                <p><strong>Rel:</strong> {quotation.enquiryDetails.relation} {quotation.enquiryDetails.relationName}</p>
              )}
              <p><strong>Phone:</strong> {quotation.customer?.phone}</p>
              <p><strong>Address:</strong> {quotation.customer?.address || '-'}, {quotation.customer?.city || '-'} - {quotation.customer?.state || '-'}</p>
            </div>

            <div className="vehicle-info doc-section">
              <h3>Vehicle Details</h3>
              <p><strong>Model:</strong> {quotation.car?.name} {quotation.car?.variant}</p>
              <p><strong>Color:</strong> {quotation.selectedColor}</p>
              <p><strong>Powertrain:</strong> {quotation.car?.fuelType} • {quotation.car?.transmission}</p>
            </div>
          </div>

          {quotation.accessories && quotation.accessories.length > 0 && (
            <div className="doc-section">
              <h3>Selected Accessories</h3>
              <table className="pricing-table">
                <thead>
                  <tr>
                    <th>Accessory Name</th>
                    <th>Category</th>
                    <th className="text-right">Price (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {quotation.accessories.map((acc: any) => (
                    <tr key={acc._id}>
                      <td>{acc.name}</td>
                      <td>{acc.category}</td>
                      <td className="text-right">{acc.price?.toLocaleString()}</td>
                    </tr>
                  ))}
                  <tr className="subtotal">
                    <td colSpan={2}><strong>Accessories Total</strong></td>
                    <td className="text-right"><strong>{quotation.pricing?.accessoriesTotal?.toLocaleString()}</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          <div className="price-breakdown doc-section">
            <h3>Comprehensive Price Breakdown</h3>
            <table className="pricing-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th className="text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Base Price (Excl. Tax & Accessories)</td>
                  <td className="text-right">₹{quotation.pricing?.exShowroom?.toLocaleString()}</td>
                </tr>
                {quotation.pricing?.accessoriesTotal > 0 && (
                <tr>
                  <td>Accessories Total</td>
                  <td className="text-right">₹{quotation.pricing?.accessoriesTotal?.toLocaleString()}</td>
                </tr>
                )}
                <tr>
                  <td>Taxable Amount (Car + Accessories)</td>
                  <td className="text-right">₹{( (quotation.pricing?.exShowroom || 0) + (quotation.pricing?.accessoriesTotal || 0) ).toLocaleString()}</td>
                </tr>
                <tr>
                  <td>CGST (14%)</td>
                  <td className="text-right">₹{( (quotation.pricing?.gstTotal || 0) / 2 ).toLocaleString()}</td>
                </tr>
                <tr>
                  <td>SGST (14%)</td>
                  <td className="text-right">₹{( (quotation.pricing?.gstTotal || 0) / 2 ).toLocaleString()}</td>
                </tr>
                <tr className="subtotal">
                  <td><strong>Ex-Showroom Price (Incl. GST)</strong></td>
                  <td className="text-right"><strong>{( (quotation.pricing?.exShowroom || 0) + (quotation.pricing?.accessoriesTotal || 0) + (quotation.pricing?.gstTotal || 0) ).toLocaleString()}</strong></td>
                </tr>
                
                {quotation.charges?.registration > 0 && (
                <tr>
                  <td>Registration & RTO Charges</td>
                  <td className="text-right">₹{quotation.charges.registration.toLocaleString()}</td>
                </tr>
                )}
                {quotation.charges?.insurance > 0 && (
                <tr>
                  <td>Comprehensive Insurance (1yr OD + 3yr TP)</td>
                  <td className="text-right">₹{quotation.charges.insurance.toLocaleString()}</td>
                </tr>
                )}
                {quotation.charges?.handling > 0 && (
                <tr>
                  <td>Logistics & Handling</td>
                  <td className="text-right">₹{quotation.charges.handling.toLocaleString()}</td>
                </tr>
                )}
                {quotation.charges?.fastag > 0 && (
                <tr>
                  <td>Static FASTag</td>
                  <td className="text-right">₹{quotation.charges.fastag.toLocaleString()}</td>
                </tr>
                )}
                {quotation.charges?.extendedWarranty > 0 && (
                <tr>
                  <td>Extended Warranty (2+3 years)</td>
                  <td className="text-right">₹{quotation.charges.extendedWarranty.toLocaleString()}</td>
                </tr>
                )}
                
                {quotation.pricing?.discountTotal > 0 && (
                <tr className="discount">
                  <td>Less: Applied Discounts & Benefits</td>
                  <td className="text-right">- ₹{quotation.pricing.discountTotal.toLocaleString()}</td>
                </tr>
                )}
                
                {quotation.pricing?.exchangeValue > 0 && (
                <tr className="discount">
                  <td>Less: Exchange Value for Old Vehicle</td>
                  <td className="text-right">- ₹{quotation.pricing.exchangeValue.toLocaleString()}</td>
                </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="final-row">
                  <td>NET ON-ROAD PRICE</td>
                  <td className="text-right">₹{quotation.pricing?.finalOnRoadPrice?.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="terms-section doc-section">
            <h3>Terms & Conditions</h3>
            <ul>
              <li>This quotation is valid for 15 days from the date of issue.</li>
              <li>Delivery is subject to availability of the model and color from the manufacturer.</li>
              <li>Prices and statutory levies are subject to change without prior notice. Price applicable at the time of invoice will be charged.</li>
              <li>Booking amount is non-refundable in case of cancellation due to changes in regulatory policies.</li>
            </ul>
          </div>

          {quotation.managerComments && (
            <div className="doc-section comments-section">
              <h3>Manager Comments</h3>
              <p className="comments-text">{quotation.managerComments}</p>
            </div>
          )}

          <div className="signatures">
            <div className="sig-box">
              <div className="line"></div>
              <p>Customer Signature</p>
            </div>
            <div className="sig-box">
              <div className="line"></div>
              <p>Authorized Dealership Signatory</p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .view-page {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }
        .actions-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: var(--spacing-sm);
          flex-wrap: wrap;
          gap: 0.75rem;
        }
        
        .pdf-container {
          background-color: #525659;
          padding: 2rem;
          display: flex;
          justify-content: center;
          overflow-x: auto;
        }

        .pdf-document {
          background-color: white;
          width: 210mm;
          min-height: 297mm;
          padding: 20mm;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          color: #333;
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          flex-shrink: 0;
        }

        .doc-header {
          display: flex;
          justify-content: space-between;
          border-bottom: 3px solid var(--brand-blue);
          padding-bottom: 20px;
          margin-bottom: 20px;
        }

        .dealer-info h1 {
          color: var(--brand-blue);
          margin: 0;
          font-size: 24px;
          font-weight: 800;
          letter-spacing: 1px;
        }
        .dealer-info p {
          margin: 4px 0 0 0;
          font-size: 12px;
          color: #555;
        }

        .doc-meta {
          text-align: right;
        }
        .doc-meta h2 {
          font-size: 16px;
          color: #333;
          margin: 0 0 10px 0;
        }
        .meta-table {
          width: 100%;
          font-size: 12px;
        }
        .meta-table td {
          padding: 2px 5px;
        }

        .doc-section {
          margin-bottom: 25px;
        }
        .doc-section h3 {
          font-size: 14px;
          color: white;
          background-color: var(--text-secondary);
          padding: 6px 10px;
          margin-bottom: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 25px;
        }

        .info-grid .doc-section {
          margin-bottom: 0px;
        }

        .customer-info p, .vehicle-info p {
          margin: 4px 0;
          font-size: 13px;
        }

        .pricing-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        .pricing-table th {
          background-color: #f3f4f6;
          padding: 10px;
          text-align: left;
          border: 1px solid #ddd;
        }
        .pricing-table td {
          padding: 8px 10px;
          border: 1px solid #ddd;
        }
        .text-right { text-align: right !important; }
        
        .subtotal td {
          background-color: #f9fafb;
        }
        .discount td {
          color: #dc2626;
        }
        
        .final-row td {
          background-color: var(--brand-blue);
          color: white;
          font-size: 16px;
          font-weight: bold;
          padding: 12px 10px;
          border: 1px solid var(--brand-blue);
        }

        .terms-section ul {
          margin: 0;
          padding-left: 20px;
          font-size: 11px;
          color: #555;
        }
        .terms-section li {
          margin-bottom: 5px;
        }

        .signatures {
          margin-top: 50px;
          display: flex;
          justify-content: space-between;
        }
        .sig-box {
          width: 200px;
          text-align: center;
        }
        .sig-box .line {
          border-bottom: 1px solid #333;
          margin-bottom: 10px;
        }
        .sig-box p {
          font-size: 12px;
          font-weight: bold;
          color: #555;
        }

        .comments-section {
          background-color: #fffbeb !important;
          border: 1px solid #fde68a;
          padding: 1rem !important;
          border-radius: 4px;
        }
        .comments-section h3 {
          background-color: #f59e0b !important;
          margin: -1rem -1rem 1rem -1rem !important;
        }
        .comments-text {
          font-size: 13px;
          color: #92400e;
          font-style: italic;
          line-height: 1.5;
        }

        @media (max-width: 768px) {
          .pdf-container {
            padding: 0.5rem;
          }
          .pdf-document {
            width: 100%;
            min-height: unset;
            padding: 5mm;
            font-size: 11px;
          }
          .doc-header {
            flex-direction: column;
            gap: 12px;
          }
          .doc-meta {
            text-align: left;
          }
          .info-grid {
            grid-template-columns: 1fr;
            gap: 12px;
          }
          .final-row td {
            font-size: 13px;
          }
          .signatures {
            margin-top: 24px;
          }
        }
        @media print {
          .actions-bar, .sidebar {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
