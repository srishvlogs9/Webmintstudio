// api/create-order.js
// Vercel serverless function — runs on the server, never in the browser.
// Reads Cashfree keys from environment variables (set in Vercel dashboard, never in code).

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, phone, email, amount } = req.body;

    if (!name || !phone || !email || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const APP_ID = process.env.CASHFREE_APP_ID;
    const SECRET_KEY = process.env.CASHFREE_SECRET_KEY;
    const ENV = process.env.CASHFREE_ENV || 'production'; // 'sandbox' or 'production'
    const SITE_URL = process.env.SITE_URL; // e.g. https://webmintstudio.in

    if (!APP_ID || !SECRET_KEY || !SITE_URL) {
      const missing = [];
      if (!APP_ID) missing.push('CASHFREE_APP_ID');
      if (!SECRET_KEY) missing.push('CASHFREE_SECRET_KEY');
      if (!SITE_URL) missing.push('SITE_URL');
      return res.status(500).json({ error: 'Missing env var(s): ' + missing.join(', ') });
    }

    const base = ENV === 'sandbox'
      ? 'https://sandbox.cashfree.com/pg'
      : 'https://api.cashfree.com/pg';

    const orderId = 'order_' + Date.now() + '_' + Math.floor(Math.random() * 100000);

    const orderPayload = {
      order_id: orderId,
      order_amount: Number(amount),
      order_currency: 'INR',
      customer_details: {
        customer_id: 'cust_' + Date.now(),
        customer_name: name,
        customer_email: email,
        customer_phone: phone
      },
      order_meta: {
        return_url: `${SITE_URL}/thankyou.html?order_id={order_id}`
      }
    };

    const cfRes = await fetch(`${base}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': APP_ID,
        'x-client-secret': SECRET_KEY,
        'x-api-version': '2023-08-01'
      },
      body: JSON.stringify(orderPayload)
    });

    const data = await cfRes.json();

    if (!cfRes.ok) {
      console.error('Cashfree order create failed:', data);
      return res.status(500).json({ error: data.message || 'Order creation failed' });
    }

    return res.status(200).json({
      order_id: data.order_id,
      payment_session_id: data.payment_session_id
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
