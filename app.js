const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

// Все конфигурируется через переменные окружения
const WEBHOOK_USER  = process.env.WEBHOOK_USER;
const WEBHOOK_PASS  = process.env.WEBHOOK_PASS;
const LAVA_BOOK_ID  = process.env.LAVA_BOOK_ID;
const LAVA_TESTPAY_ID = process.env.LAVA_TESTPAY_ID;
const GC_PRODUCT_ID = process.env.GC_PRODUCT_ID;
const GC_API_KEY    = process.env.GC_API_KEY;
const GC_DOMAIN     = process.env.GC_DOMAIN;

async function createSale(email, name, amount, currency, productId) {
  try {
    const resp = await axios.post(
      `https://${GC_DOMAIN}/pl/api/sales`,
      {
        key: GC_API_KEY,
        action: 'add',
        user: {
          email: email,
          first_name: name || 'Без имени'
        },
        system: {
          refresh_if_exists: 1
        },
        sale: {
          product_id: GC_PRODUCT_ID,
          payment_status: 'paid',
          payment_type: 'LavaTop',
          sum: amount || 0,
          comment: `Оплата через LavaTop (${productId}, ${currency})`
        }
      }
    );
    console.log('✅ Продажа создана в GetCourse', resp.data);
  } catch (err) {
    console.error('❌ Ошибка при создании продажи:', err.response?.data || err.message);
  }
}

app.post('/lava-webhook', async (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return res.status(401).send('Unauthorized');
  }
  const credentials = Buffer.from(authHeader.split(' ')[1], 'base64').toString('utf8');
  const [username, password] = credentials.split(':');
  if (username !== WEBHOOK_USER || password !== WEBHOOK_PASS) {
    return res.status(403).send('Forbidden');
  }

  const data = req.body;
  console.log('📩 Получен веб‑хук:', JSON.stringify(data, null, 2));
  const { status, buyer, productId, amount, currency } = data;

  if (status === 'PAID') {
    const email = buyer?.email;
    const name  = buyer?.name || 'Без имени';
    if (!email) {
      console.warn('❌ Нет email в заказе, доступ не выдан');
    } else if (productId === LAVA_BOOK_ID || productId === LAVA_TESTPAY_ID) {
      await createSale(email, name, amount, currency, productId);
    } else {
      console.log(`ℹ️ Оплата по другому продукту (${productId}), пропускаем`);
    }
  }
  res.status(200).send('ok');
});

// Запускаем сервер
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Сервер слушает на порту ${PORT}`);
});
