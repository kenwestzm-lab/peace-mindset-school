const axios = require('axios');

const SUBSCRIPTION_KEY = (process.env.MOMO_SUBSCRIPTION_KEY || '').trim();
const USER_ID = (process.env.MOMO_USER_ID || '').trim();
const API_KEY = (process.env.MOMO_API_KEY || '').trim();
const BASE_URL = 'https://sandbox.momodeveloper.mtn.com';
const TARGET_ENV = 'sandbox';

// Developer's locked MTN number
const DEVELOPER_MOMO = '260761468402';

async function getAccessToken() {
  const credentials = Buffer.from(`${USER_ID}:${API_KEY}`).toString('base64');
  const res = await axios.post(
    `${BASE_URL}/disbursement/token/`,
    {},
    {
      headers: {
        Authorization: `Basic ${credentials}`,
        'Ocp-Apim-Subscription-Key': SUBSCRIPTION_KEY,
        'X-Target-Environment': TARGET_ENV,
      }
    }
  );
  return res.data.access_token;
}

async function sendMoney({ amount, phone, name, reason, developerOnly = false }) {
  // If developer withdrawal, always use locked number
  if (developerOnly) phone = DEVELOPER_MOMO;

  // Format phone: 0961234567 → 260961234567
  phone = String(phone).trim();
  if (phone.startsWith('0')) phone = '260' + phone.slice(1);

  const token = await getAccessToken();
  const transferId = require('crypto').randomUUID();

  await axios.post(
    `${BASE_URL}/disbursement/v1_0/transfer`,
    {
      amount: String(amount),
      currency: 'EUR',
      externalId: transferId,
      payee: { partyIdType: 'MSISDN', partyId: phone },
      payerMessage: reason || 'Payment from Peace Mindset School',
      payeeNote: name || 'Recipient',
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Reference-Id': transferId,
        'X-Target-Environment': TARGET_ENV,
        'Ocp-Apim-Subscription-Key': SUBSCRIPTION_KEY,
        'Content-Type': 'application/json',
      }
    }
  );
  return transferId;
}

module.exports = { sendMoney, getAccessToken, DEVELOPER_MOMO };
