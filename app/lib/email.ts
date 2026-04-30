import nodemailer from 'nodemailer';

/** Creates a reusable Gmail transporter using App Password credentials */
function createTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

export interface StockAlertEmailPayload {
  productName: string;
  quantity: number;
  unit: string;
  threshold: number;
  alertMessage: string;
  createdAt?: string;
}

/** Sends a low-stock Gmail alert to the stock manager */
export async function sendStockAlertEmail(payload: StockAlertEmailPayload): Promise<{ success: boolean; error?: string }> {
  const managerEmail = process.env.STOCK_MANAGER_EMAIL;
  const senderEmail = process.env.GMAIL_USER;

  if (!senderEmail || !process.env.GMAIL_APP_PASSWORD) {
    return { success: false, error: 'Gmail credentials are not configured in .env.local' };
  }
  if (!managerEmail) {
    return { success: false, error: 'STOCK_MANAGER_EMAIL is not configured in .env.local' };
  }

  const { productName, quantity, unit, threshold, alertMessage, createdAt } = payload;

  const htmlBody = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f0f0f; border-radius: 12px; overflow: hidden; border: 1px solid #2a2a2a;">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%); padding: 28px 32px;">
        <div style="font-size: 28px; margin-bottom: 8px;">⚠️ Low Stock Alert</div>
        <div style="color: rgba(255,255,255,0.9); font-size: 14px;">Cafe 69 Inventory Management System</div>
      </div>

      <!-- Body -->
      <div style="padding: 32px;">
        <p style="color: #e5e7eb; font-size: 16px; margin: 0 0 24px;">
          Dear Stock Manager, a product has fallen <strong style="color: #ef4444;">below the minimum stock threshold</strong> and requires immediate attention.
        </p>

        <!-- Product Card -->
        <div style="background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.25); border-radius: 10px; padding: 20px; margin-bottom: 24px;">
          <div style="font-size: 20px; font-weight: 700; color: #f1f5f9; margin-bottom: 12px;">📦 ${productName}</div>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #9ca3af; font-size: 13px; width: 140px;">Current Stock</td>
              <td style="padding: 8px 0; color: #ef4444; font-weight: 700; font-size: 18px;">${quantity} ${unit}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #9ca3af; font-size: 13px;">Min. Threshold</td>
              <td style="padding: 8px 0; color: #f59e0b; font-weight: 600;">${threshold} ${unit}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #9ca3af; font-size: 13px;">Alert Generated</td>
              <td style="padding: 8px 0; color: #6b7280; font-size: 13px;">${createdAt ? createdAt.slice(0, 16).replace('T', ' ') : new Date().toISOString().slice(0, 16).replace('T', ' ')}</td>
            </tr>
          </table>
        </div>

        <!-- Message -->
        <div style="background: #1a1a2e; border-left: 3px solid #f59e0b; padding: 14px 18px; border-radius: 4px; margin-bottom: 24px;">
          <div style="color: #f59e0b; font-size: 11px; font-weight: 700; letter-spacing: 1px; margin-bottom: 6px;">SYSTEM MESSAGE</div>
          <div style="color: #d1d5db; font-size: 14px;">${alertMessage}</div>
        </div>

        <!-- CTA -->
        <div style="text-align: center; margin-bottom: 12px;">
          <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dashboard/inventory/products"
             style="display: inline-block; background: linear-gradient(135deg, #f59e0b, #ef4444); color: white; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px;">
            🔗 View Inventory
          </a>
        </div>
      </div>

      <!-- Footer -->
      <div style="padding: 16px 32px; background: #0a0a0a; text-align: center; border-top: 1px solid #1f1f1f;">
        <div style="color: #4b5563; font-size: 12px;">This is an automated alert from <strong style="color: #f59e0b;">Cafe 69 IMS</strong> · Do not reply to this email</div>
      </div>
    </div>
  `;

  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"Cafe 69 IMS 🏪" <${senderEmail}>`,
      to: managerEmail,
      subject: `⚠️ Low Stock Alert: ${productName} (${quantity} ${unit} remaining)`,
      html: htmlBody,
      text: `LOW STOCK ALERT\n\nProduct: ${productName}\nCurrent Stock: ${quantity} ${unit}\nMin. Threshold: ${threshold} ${unit}\n\n${alertMessage}`,
    });
    return { success: true };
  } catch (err: any) {
    console.error('[Email] Failed to send stock alert email:', err);

    // Provide clear, actionable error messages
    const msg: string = err?.message || '';
    if (msg.includes('535') || msg.includes('BadCredentials') || msg.includes('Username and Password not accepted')) {
      return {
        success: false,
        error:
          'Gmail authentication failed (535). Fix: ' +
          '(1) Enable 2-Step Verification at myaccount.google.com/security, ' +
          '(2) Generate an App Password at myaccount.google.com/apppasswords, ' +
          '(3) Paste it into GMAIL_APP_PASSWORD in .env.local WITHOUT spaces, ' +
          '(4) Restart the dev server.',
      };
    }
    if (msg.includes('ECONNREFUSED') || msg.includes('ETIMEDOUT')) {
      return { success: false, error: 'Cannot connect to Gmail SMTP. Check your internet connection.' };
    }
    return { success: false, error: msg || 'Unknown error sending email' };
  }
}
