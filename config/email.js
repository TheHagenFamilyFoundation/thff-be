module.exports.email = {
    service: "Mailgun",
    auth: {
      user: process.env.MAILGUN_USER,
      pass: process.env.MAILGUN_PASSWORD
    },
    from: "email@hagen.foundation",
    templateDir: "views/emailTemplates",
    testMode: false
  }