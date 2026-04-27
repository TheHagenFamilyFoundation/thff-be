import Mailgun from 'mailgun.js';
import formData from 'form-data';

import Config from './config.js';

const mailgun = new Mailgun(formData);

let cachedClient = null;

/** Official Mailgun SDK client (replaces deprecated mailgun-js / vulnerable proxy chain). */
export function getMailgunClient() {
  if (!Config.mailgunKey) {
    return null;
  }
  if (!cachedClient) {
    cachedClient = mailgun.client({
      username: 'api',
      key: Config.mailgunKey,
    });
  }
  return cachedClient;
}
