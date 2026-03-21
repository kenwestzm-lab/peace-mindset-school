const axios = require('axios');

const BASE_URL = (process.env.PESAPAL_BASE_URL || 'https://pay.pesapal.com/v3').trim();
const CONSUMER_KEY = (process.env.PESAPAL_CONSUMER_KEY || '').trim();
const CONSUMER_SECRET = (process.env.PESAPAL_CONSUMER_SECRET || '').trim();

// Step 1: Get Auth Token
async function getToken() {
  const res = await axios.post(`${BASE_URL}/api/Auth/RequestToken`, {
    consumer_key: CONSUMER_KEY,
    consumer_secret: CONSUMER_SECRET,
  }, { headers: { Accept: 'application/json', 'Content-Type': 'application/json' } });
  return res.data.token;
}

// Step 2: Register IPN URL (do once)
async function registerIPN(ipnUrl) {
  const token = await getToken();
  const res = await axios.post(`${BASE_URL}/api/URLSetup/RegisterIPN`, {
    url: ipnUrl,
    ipn_notification_type: 'POST',
  }, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
  });
  return res.data.ipn_id;
}

// Step 3: Submit payment order → returns redirect URL
async function submitOrder({ amount, currency = 'ZMW', reference, description, email, phone, firstName, lastName, callbackUrl, ipnId }) {
  const token = await getToken();
  const res = await axios.post(`${BASE_URL}/api/Transactions/SubmitOrderRequest`, {
    id: reference,
    currency,
    amount,
    description,
    callback_url: callbackUrl,
    notification_id: ipnId,
    billing_address: {
      email_address: email || 'parent@peacemindset.zm',
      phone_number: phone || '',
      first_name: firstName || 'Parent',
      last_name: lastName || 'User',
    }
  }, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
  });
  return res.data; // contains redirect_url and order_tracking_id
}

// Step 4: Check payment status
async function getTransactionStatus(orderTrackingId) {
  const token = await getToken();
  const res = await axios.get(
    `${BASE_URL}/api/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data;
}

module.exports = { getToken, registerIPN, submitOrder, getTransactionStatus };
