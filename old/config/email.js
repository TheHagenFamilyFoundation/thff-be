
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


// var mailgun_user;
// var mailgun_password;

// try {
//   var locals = require('./local.js');
// }
// catch (e) {
//   mailgun_user = process.env.MAILGUN_USER;
//   mailgun_password = process.env.MAILGUN_PASSWORD;
// }

// module.exports.email = {

//   service: "Mailgun",
//   auth: {
//     user: process.env.MAILGUN_USER ? process.env.MAILGUN_USER : locals.mailgun_user,
//     pass: process.env.MAILGUN_PASSWORD ? process.env.MAILGUN_PASSWORD : locals.mailgun_password
//   },
//   from: "email@hagen.foundation",
//   templateDir: "views/emailTemplates",
//   testMode: false
// }