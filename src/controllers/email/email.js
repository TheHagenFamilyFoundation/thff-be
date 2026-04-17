import handlebars from 'handlebars';

import Config from '../../config/config.js';
import { getMailgunClient } from '../../config/mailgun.js';
import Logger from '../../utils/logger.js';
import { wrapInLayout } from '../../views/layout.js';

// Function to compile and render a Handlebars template
function compileTemplate(template, data) {
  const compiledTemplate = handlebars.compile(template);
  const body = compiledTemplate(data);
  return wrapInLayout(body);
}

/** Full HTML email body (layout + template), same as sent via Mailgun */
export function renderEmailWithTemplate(template, data) {
  return compileTemplate(template, data);
}

/** Send a pre-rendered HTML body via Mailgun */
export function sendHtmlEmail(to, subject, html) {
  if (!Config.mailgunKey || !Config.mailgunDomain) {
    Logger.error('Mailgun not configured: MAILGUN_KEY or MAILGUN_DOMAIN missing');
    return Promise.reject(new Error('Email service not configured'));
  }

  const mg = getMailgunClient();
  if (!mg) {
    return Promise.reject(new Error('Mailgun client not available'));
  }

  const recipients = Array.isArray(to) ? to : [to];

  return mg.messages
    .create(Config.mailgunDomain, {
      from: 'The Hagen Family Foundation <admin@hagenfoundation.org>',
      to: recipients,
      subject,
      html,
    })
    .then((body) => {
      Logger.info('Email sent successfully:', {
        to: recipients.join(', '),
        subject,
        messageId: body?.id || 'unknown',
      });
      return body;
    })
    .catch((error) => {
      Logger.error('Error sending email:', {
        error: error.message || error,
        to: recipients.join(', '),
        subject,
        stack: error.stack,
      });
      throw error;
    });
}

// Function to send an email with a templated HTML body
export function sendEmailWithTemplate(to, subject, template, data) {
  const html = compileTemplate(template, data);
  return sendHtmlEmail(to, subject, html);
}
