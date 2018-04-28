
// var fs = require('fs');

// if (fs.existsSync('./local')) {
//   locals = require('./local');
// }
// else {
//   locals = undefined;
// }


// try {
//   var locals = require('./local');
//   // do stuff
// } catch (ex) {
//   handleErr(ex);
// }


var mailgun_user;
var mailgun_password;

try {
  var locals = require('./local');
}
catch (e) {
  mailgun_user = process.env.MAILGUN_USER;
  mailgun_password = process.env.MAILGUN_PASSWORD;
}

module.exports.email = {
  service: "Mailgun",
  auth: {
    user: mailgun_user || locals.mailgun_user,
    pass: mailgun_password || locals.mailgun_password
  },
  from: "email@hagen.foundation",
  templateDir: "views/emailTemplates",
  testMode: false
}