const express = require('express');
const router = express.Router();
const { sendMoney } = require('../utils/momo');
const { protect, authorize } = require('../middleware/auth');

// POST /api/disbursement/send — Admin & Developer only
router.post('/send', protect, authorize('admin', 'developer'), async (req, res) => {
  try {
    const { amount, phone, name, reason } = req.body;
    if (!amount || !phone) {
      return res.status(400).json({ error: 'amount and phone are required' });
    }
    const transferId = await sendMoney({ amount, phone, name, reason });
    res.json({ success: true, transferId });
  } catch (err) {
    console.error('MoMo error:', err?.response?.data || err.message);
    res.status(500).json({ error: 'Disbursement failed', details: err?.response?.data });
  }
});

module.exports = router;
