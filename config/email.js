
locals = require('./local');

module.exports.email = {
  service: "Mailgun",
  auth: {
    user: process.env.MAILGUN_USER || locals.mailgun_user,
    pass: process.env.MAILGUN_PASSWORD || locals.mailgun_password
  },
  from: "email@hagen.foundation",
  templateDir: "views/emailTemplates",
  testMode: false
}