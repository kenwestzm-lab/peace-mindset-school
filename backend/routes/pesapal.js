const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { submitOrder, getTransactionStatus, registerIPN } = require('../utils/pesapal');
const Payment = require('../models/Payment');
const { protect } = require('../middleware/auth');

// POST /api/pesapal/initiate — parent initiates payment
router.post('/initiate', protect, async (req, res) => {
  try {
    const { amount, childId, paymentType, description } = req.body;
    const reference = crypto.randomUUID();
    const ipnId = process.env.PESAPAL_IPN_ID || '';
    const callbackUrl = `${process.env.FRONTEND_URL}/parent/payment-callback`;

    const result = await submitOrder({
      amount,
      reference,
      description: description || `School fee - ${paymentType}`,
      email: req.user.email,
      phone: req.user.phone || '',
      firstName: req.user.name?.split(' ')[0] || 'Parent',
      lastName: req.user.name?.split(' ')[1] || '',
      callbackUrl,
      ipnId,
    });

    res.json({
      success: true,
      redirectUrl: result.redirect_url,
      orderTrackingId: result.order_tracking_id,
      reference,
    });
  } catch (err) {
    console.error('Pesapal error:', err?.response?.data || err.message);
    res.status(500).json({ error: 'Payment initiation failed', details: err?.response?.data });
  }
});

// GET /api/pesapal/status/:trackingId
router.get('/status/:trackingId', protect, async (req, res) => {
  try {
    const status = await getTransactionStatus(req.params.trackingId);
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: 'Status check failed' });
  }
});

// POST /api/pesapal/ipn — Pesapal notifies us of payment
router.post('/ipn', async (req, res) => {
  try {
    const { orderTrackingId, orderMerchantReference } = req.body;
    const status = await getTransactionStatus(orderTrackingId);
    if (status.payment_status_description === 'Completed') {
      console.log(`✅ Pesapal payment completed: ${orderMerchantReference}`);
    }
    res.json({ status: 'OK' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/pesapal/register-ipn — run once to register IPN
router.post('/register-ipn', protect, async (req, res) => {
  try {
    const ipnUrl = `${req.protocol}://${req.get('host')}/api/pesapal/ipn`;
    const ipnId = await registerIPN(ipnUrl);
    res.json({ success: true, ipnId, message: `Add PESAPAL_IPN_ID=${ipnId} to your .env` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
