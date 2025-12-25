import handlebars from 'handlebars';

import Config from '../../config/config.js';
import Logger from '../../utils/logger.js';
import { mg } from '../../config/index.js';

// Function to compile and render a Handlebars template
function compileTemplate(template, data) {
  const compiledTemplate = handlebars.compile(template);
  return compiledTemplate(data);
}

// Function to send an email with a templated HTML body
export function sendEmailWithTemplate(to, subject, template, data) {
  // Validate Mailgun configuration
  if (!Config.mailgunKey || !Config.mailgunDomain) {
    Logger.error('Mailgun not configured: MAILGUN_KEY or MAILGUN_DOMAIN missing');
    return Promise.reject(new Error('Email service not configured'));
  }

  const html = compileTemplate(template, data);

  const emailData = {
    from: 'admin@hagenfoundation.org',
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
