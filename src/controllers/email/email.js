import handlebars from 'handlebars';

import { mg } from '../../config/index.js';

// Function to compile and render a Handlebars template
function compileTemplate(template, data) {
  const compiledTemplate = handlebars.compile(template);
  return compiledTemplate(data);
}

// Function to send an email with a templated HTML body
export function sendEmailWithTemplate(to, subject, template, data) {
  const html = compileTemplate(template, data);

  const emailData = {
    from: 'admin@hagenfoundation.org',
    to: to,
    subject: subject,
    html: html
  };

  mg.messages().send(emailData, (error, body) => {
    if (error) {
      console.error('Error sending email:', error);
    } else {
      console.log('Email sent successfully:', body);
    }
  });
}
