const mailjet = require('node-mailjet');
require('dotenv').config();

// --- Mailjet Client Setup (Resilient Initialization) ---
const mailjetClient = mailjet.apiConnect(
  process.env.MJ_API_KEY,
  process.env.MJ_API_SECRET
);

// =================================================================
// 💰 CRITICAL FIX: NEW HELPER FUNCTION FOR CURRENCY CONVERSION
// This function assumes prices are passed in the minor unit (Paise)
// and converts them to the major unit (Rupees).
// =================================================================
const convertPaiseToRupees = (amountInPaise) => {
    if (typeof amountInPaise !== 'number' || amountInPaise === null) return '0.00';
    // Division by 100 fixes the 200 vs 2.00 issue
    return (amountInPaise / 100).toFixed(2);
};

// Helper function to generate the HTML for cart items (used by both emails)
const generateCartItemsHtml = (cart) => {
  return cart.map(item => `
    <tr>
      <td style="padding: 5px 10px; border-bottom: 1px solid #eee;">
        <strong>${item.name}</strong><br/>
        <small>Size: ${item.size} | Qty: ${item.quantity}</small>
      </td>
      <td style="padding: 5px 10px; border-bottom: 1px solid #eee; text-align: right;">
        <!-- FIX APPLIED: Item price is now converted to Rupees -->
        ₹${convertPaiseToRupees(item.price * item.quantity)}
      </td>
    </tr>
  `).join('');
};

// Base function for sending Mailjet requests
const sendMailjetRequest = async (toEmail, subject, htmlContent) => {
    try {
        const result = await mailjetClient.post('send', { version: 'v3.1' }).request({
            Messages: [
                {
                    From: { Email: process.env.MJ_SENDER_EMAIL, Name: 'Pasheon E-Commerce' },
                    To: [{ Email: toEmail }],
                    Subject: subject,
                    HTMLPart: htmlContent, 
                    // Best practice would be to add a TextPart here as well!
                },
            ],
        });

        const status = result.body?.Messages?.[0]?.Status;
        
        if (status !== 'success' && status !== 'queued') {
            console.error('❌ Mailjet rejected email:', result.body?.Messages?.[0]?.Errors);
            throw new Error(`Mailjet sending failed with status: ${status}`);
        }

        return true;
    } catch (err) {
        console.error(`❌ Failed to send email to ${toEmail}:`, err.message);
        throw err;
    }
};


/**
 * Sends a notification email to the ADMIN upon a new customer order.
 * @param {object} orderData - Data about the new order, customer info, and items.
 */
exports.sendOrderEmail = async (orderData) => {
  const { name, email, phone, address, cart, payment, total_amount } = orderData;
  const cartItemsHtml = generateCartItemsHtml(cart);
  
  // FIX APPLIED: Convert total amount for display
  const totalInRupees = convertPaiseToRupees(total_amount);

  const htmlContent = `
    <div style="font-family: sans-serif; padding: 20px; border: 1px solid #ccc; border-radius: 8px;">
      <h2>🛒 New Order Received</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Phone:</strong> ${phone}</p>
      <p><strong>Address:</strong> ${address}</p>
      <p><strong>Payment ID:</strong> ${payment}</p>
      <br/>
      <h3>Order Summary:</h3>
      <table style="width: 100%; border-collapse: collapse;">
        ${cartItemsHtml}
        <tr>
            <td style="padding: 10px; font-weight: bold; text-align: right;">TOTAL:</td>
            <!-- FIX APPLIED: Use converted price -->
            <td style="padding: 10px; font-weight: bold; text-align: right; color: #4CAF50;">₹${totalInRupees}</td>
        </tr>
      </table>
      <p>Regards,<br/>Pasheon Bot</p>
    </div>
  `;

  try {
    await sendMailjetRequest(
        process.env.ADMIN_EMAIL, // Send to the admin
        // FIX APPLIED: Use converted price in the subject
        `🛒 New Order from ${name} - ₹${totalInRupees}`,
        htmlContent
    );
    console.log(`✅ Admin notification sent for order from ${name}`);
  } catch (error) {
    console.error('❌ Failed to send ADMIN order notification:', error);
    throw error;
  }
};


/**
 * Sends a confirmation email to the CUSTOMER after a successful order.
 * @param {object} orderData - Data about the new order, customer info, and items.
 */
exports.sendCustomerConfirmation = async (orderData) => {
  const { name, email, cart, total_amount } = orderData;
  const cartItemsHtml = generateCartItemsHtml(cart);

  // FIX APPLIED: Convert total amount for display
  const totalInRupees = convertPaiseToRupees(total_amount);

  const htmlContent = `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
      <h2 style="color: #4CAF50;">🎉 Order Placed Successfully, ${name}!</h2>
      <p>Thank you for your purchase. Your order is confirmed and will be processed soon!</p>
      
      <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
        <thead>
          <tr style="background-color: #f1f1f1;">
            <th style="padding: 10px; text-align: left;">Item Details</th>
            <th style="padding: 10px; text-align: right;">Price</th>
          </tr>
        </thead>
        <tbody>
          ${cartItemsHtml}
        </tbody>
        <tfoot>
          <tr>
            <td style="padding: 15px 10px; font-weight: bold; text-align: right;">ORDER TOTAL:</td>
            <!-- FIX APPLIED: Use converted price -->
            <td style="padding: 15px 10px; font-weight: bold; text-align: right; color: #4CAF50;">₹${totalInRupees}</td>
          </tr>
        </tfoot>
      </table>

      <p style="margin-top: 30px; font-size: 0.9em; color: #666;">If you have any questions, please reply to this email.</p>
    </div>
  `;

  try {
    await sendMailjetRequest(
        email, // Send to the customer's email
        // FIX APPLIED: Use converted price in the subject
        `🎉 Your Pasheon Order Confirmation - ₹${totalInRupees}`,
        htmlContent
    );
    console.log(`✅ Customer confirmation sent to ${email}`);
  } catch (error) {
    console.error(`❌ Failed to send CUSTOMER confirmation to ${email}:`, error);
    // Note: We typically log this failure and continue the checkout process, 
    // as the order is already placed and paid for.
  }
};