import mailgun from 'mailgun-js';

import Config from './config.js';

// Initialize Mailgun with your API key and domain
export const mg = mailgun({ apiKey: Config.mailgunKey, domain: Config.mailgunDomain });
