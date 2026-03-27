import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
  try {
    const { to, subject, body, pdfBase64, filename } = await req.json();

    if (!to || !pdfBase64) {
      return NextResponse.json({ error: 'Missing destination email or PDF attachment' }, { status: 400 });
    }

    // Convert base64 Data URL to Buffer
    // e.g. "data:application/pdf;base64,JVBERi0xLjQKJcO..."
    const base64Data = pdfBase64.replace(/^data:application\/pdf;base64,/, "");
    const pdfBuffer = Buffer.from(base64Data, 'base64');

    // Create a Nodemailer transporter. 
    // Usually uses process.env.SMTP_HOST, process.env.SMTP_USER, etc.
    // For local development out of the box, we will use a dummy/console transport
    // or standard ethereal if config is missing.
    
    // In actual production, replace these with real SMTP settings via env variables.
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.ethereal.email',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER || 'leola.zboncak38@ethereal.email', // dummy fallback
        pass: process.env.SMTP_PASS || 'd8A7PZNx59VqTfJgS1'
      }
    });

    const mailOptions = {
      from: process.env.SMTP_FROM || '"QuoteGuru System" <noreply@quoteguru.com>',
      to: to,
      subject: subject || 'Your Dealership Quotation',
      text: body || 'Please find your requested quotation attached.',
      html: body ? `<p>${body}</p>` : '<p>Please find your requested quotation attached.</p>',
      attachments: [
        {
          filename: filename || 'Quotation.pdf',
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log('API EMAIL: Message sent %s', info.messageId);

    // If using Ethereal, we can log the URL to preview the email
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log('API EMAIL: Preview URL: %s', previewUrl);
    }

    return NextResponse.json({ 
      success: true, 
      messageId: info.messageId,
      previewUrl: previewUrl || null
    }, { status: 200 });

  } catch (error: any) {
    console.error('Email Dispatch Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to send email' }, { status: 500 });
  }
}
