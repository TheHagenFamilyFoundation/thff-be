import handlebars from 'handlebars';

import Config from '../../config/config.js';
import Logger from '../../utils/logger.js';
import { mg } from '../../config/index.js';
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

  const emailData = {
    from: 'The Hagen Family Foundation <admin@hagenfoundation.org>',
    to: to,
    subject: subject,
    html: html
  };

  return new Promise((resolve, reject) => {
    mg.messages().send(emailData, (error, body) => {
      if (error) {
        Logger.error('Error sending email:', {
          error: error.message || error,
          to: to,
          subject: subject,
          stack: error.stack
        });
        reject(error);
      } else {
        Logger.info('Email sent successfully:', {
          to: to,
          subject: subject,
          messageId: body?.id || 'unknown'
        });
        resolve(body);
      }
    });
  });
}

// Function to send an email with a templated HTML body
export function sendEmailWithTemplate(to, subject, template, data) {
  const html = compileTemplate(template, data);
  return sendHtmlEmail(to, subject, html);
}
