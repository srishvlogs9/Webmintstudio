// api/verify-order.js
// Checks payment status directly with Cashfree (server-to-server) — never trust the
// browser's word that "payment succeeded". Only after this confirms PAID do we let
// the download link go out.

module.exports = async (req, res) => {
  try {
    const { order_id } = req.query;
    if (!order_id) {
      return res.status(400).json({ error: 'order_id required' });
    }

    const APP_ID = process.env.CASHFREE_APP_ID;
    const SECRET_KEY = process.env.CASHFREE_SECRET_KEY;
    const ENV = process.env.CASHFREE_ENV || 'production';
    const DOWNLOAD_LINK = process.env.DOWNLOAD_LINK; // set this once you have real file hosting

    const base = ENV === 'sandbox'
      ? 'https://sandbox.cashfree.com/pg'
      : 'https://api.cashfree.com/pg';

    const cfRes = await fetch(`${base}/orders/${order_id}`, {
      method: 'GET',
      headers: {
        'x-client-id': APP_ID,
        'x-client-secret': SECRET_KEY,
        'x-api-version': '2023-08-01'
      }
    });

    const data = await cfRes.json();

    if (!cfRes.ok) {
      return res.status(500).json({ error: data.message || 'Could not verify order' });
    }

    const isPaid = data.order_status === 'PAID';

    return res.status(200).json({
      status: data.order_status,
      paid: isPaid,
      download_link: isPaid ? (DOWNLOAD_LINK || null) : null
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
