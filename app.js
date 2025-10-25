const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.send('Webhook server is running');
});

app.post('/webhook', async (req, res) => {
  const event = req.body;
  // We expect Lava.top to send payment status via webhook
  if (!event || event.status !== 'success') {
    // If payment not successful, do nothing
    return res.status(200).send('Event not processed');
  }
  try {
    const url = `https://${process.env.GETCOURSE_DOMAIN}/pl/api/users`;
    const params = {
      user: {
        email: event.customer.email,
        phone: event.customer.phone,
        first_name: event.customer.name
      },
      system: {
        refresh_if_exists: 1,
        send_confirmation_email: 0,
        add_to_groups: [process.env.COURSE_ID]
      },
      key: process.env.GETCOURSE_SECRET_KEY
    };
    const response = await axios.post(url, params);
    console.log('User added:', response.data);
    res.status(200).send('User added');
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    res.status(500).send('Error processing');
  }
});

app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
