module.exports = {


  friendlyName: 'Send template email',


  description: 'Send an email using a template.',


  extendedDescription:
    `To ease testing and development, if the provided "to" email address ends in "@example.com",
  then the email message will be written to the terminal instead of actually being sent.
  (Thanks [@simonratner](https://github.com/simonratner)!)`,


  inputs: {

    template: {
      description: 'The relative path to an EJS template within our `views/emails/` folder -- WITHOUT the file extension.',
      extendedDescription:
        `Use strings like "foo" or "foo/bar", but NEVER "foo/bar.ejs".  For example, "marketing/welcome" would send an email
  using the "views/emails/marketing/welcome.ejs" template.`,
      example: 'reset-password',
      type: 'string',
      required: true,
    },

    templateData: {
      description: 'A dictionary of data which will be accessible in the EJS template.',
      extendedDescription:
        `Each key will be a local variable accessible in the template.  For instance, if you supply
  a dictionary with a \`friends\` key, and \`friends\` is an array like \`[{name:"Chandra"}, {name:"Mary"}]\`),
  then you will be able to access \`friends\` from the template:
  \`\`\`
  <ul><% for (friend of friends){ %>
    <li><%= friend.name %></li><% }); %></ul>
  \`\`\`
  This is EJS, so use \`<%= %>\` to inject the HTML-escaped content of a variable,
  \`<%= %>\` to skip HTML-escaping and inject the data as-is, or \`<% %>\` to execute
  some JavaScript code such as an \`if\` statement or \`for\` loop.`,
      type: {},
      defaultsTo: {},
    },

    to: {
      description: 'The email address of the primary recipient.',
      extendedDescription:
        `If this is any address ending in "@example.com", then don't actually deliver the message.
  Instead, just log it to the console.`,
      example: 'foo@bar.com',
      required: true,
    },

    subject: {
      description: 'The subject of the email.',
      example: 'Hello there.',
      defaultsTo: '',
    },

    layout: {
      description:
        'Set to `false` to disable layouts altogether, or provide the path (relative '
        + 'from `views/layouts/`) to an override email layout.',
      defaultsTo: 'layout-email',
      custom: (layout) => layout === false || _.isString(layout),
    },

  },


  exits: {

    success: {
      outputFriendlyName: 'Email delivery report',
      outputDescription: 'A dictionary of information about what went down.',
      outputType: {
        loggedInsteadOfSending: 'boolean',
      },
    },

  },

  async fn(inputs, exits) {
    sails.log('sending template email', inputs);

    const path = require('path');
    const url = require('url');
    const util = require('util');


    sails.log('FE_API', sails.config.custom.FE_API);

    if (!_.startsWith(path.basename(inputs.template), 'email-')) {
      sails.log.warn(
        'The "template" that was passed in to `sendTemplateEmail()` does not begin with '
        + '"email-" -- but by convention, all email template files in `views/emails/` should '
        + 'be namespaced in this way.  (This makes it easier to look up email templates by '
        + 'filename; e.g. when using CMD/CTRL+P in Sublime Text.)\n'
        + 'Continuing regardless...',
      );
    }

    if (_.startsWith(inputs.template, 'views/') || _.startsWith(inputs.template, 'emails/')) {
      throw new Error(
        'The "template" that was passed in to `sendTemplateEmail()` was prefixed with\n'
        + '`emails/` or `views/` -- but that part is supposed to be omitted.  Instead, please\n'
        + 'just specify the path to the desired email template relative from `views/emails/`.\n'
        + 'For example:\n'
        + '  template: \'email-reset-password\'\n'
        + 'Or:\n'
        + '  template: \'admin/email-contact-form\'\n'
        + ' [?] If you\'re unsure or need advice, see https://sailsjs.com/support',
      );
    }// •

    // Determine appropriate email layout and template to use.
    const emailTemplatePath = path.join('emails/', inputs.template);
    let layout;

    if (inputs.layout) {
      layout = path.relative(path.dirname(emailTemplatePath), path.resolve('layouts/', inputs.layout));
    } else {
      layout = false;
    }

    // Compile HTML template.
    // > Note that we set the layout, provide access to core `url` package (for
    // > building links and image srcs, etc.), and also provide access to core
    // > `util` package (for dumping debug data in internal emails).
    const htmlEmailContents = await sails.renderView(
      emailTemplatePath,
      {
        layout, url, util, ...inputs.templateData,
      },
    )
      .intercept((err) => {
        err.message = `${'Could not compile view template.\n'
          + '(Usually, this means the provided data is invalid, or missing a piece.)\n'
          + 'Details:\n'}${err.message}`;
        return err;
      });

    sails.log('sending template email 2', inputs);

    // Sometimes only log info to the console about the email that WOULD have been sent.
    // Specifically, if the "To" email address is anything "@example.com".
    //
    // > This is used below when determining whether to actually send the email,
    // > for convenience during development, but also for safety.  (For example,
    // > a special-cased version of "user@example.com" is used by Trend Micro Mars
    // > scanner to "check apks for malware".)
    const isToAddressConsideredFake = Boolean(inputs.to.match(/@example\.com$/i));

    // If that's the case, or if we're in the "test" environment, then log
    // the email instead of sending it:
    if (sails.config.environment === 'test' || isToAddressConsideredFake) {
      sails.log(
        `Skipped sending email, either because the "To" email address ended in "@example.com"
  or because the current \`sails.config.environment\` is set to "test".
  But anyway, here is what WOULD have been sent:
  -=-=-=-=-=-=-=-=-=-=-=-=-= Email log =-=-=-=-=-=-=-=-=-=-=-=-=-
  To: ${inputs.to}
  Subject: ${inputs.subject}
  Body:
  ${htmlEmailContents}
  -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-`,
      );
    } else {
      // Otherwise, we'll check that all required Mailgun credentials are set up
      // and, if so, continue to actually send the email.

      sails.log('sails.config.custom.mailgunSecret', sails.config.custom.mailgunSecret);
      sails.log('sails.config.custom.mailgunDomain', sails.config.custom.mailgunDomain);

      if (!sails.config.custom.mailgunSecret || !sails.config.custom.mailgunDomain) {
        throw new Error(`Cannot deliver email to "${inputs.to}" because:
            ${(() => {
            const problems = [];
            if (!sails.config.custom.mailgunSecret) {
              problems.push(' • Mailgun secret is missing from this app\'s configuration (`sails.config.custom.mailgunSecret`)');
            }
            if (!sails.config.custom.mailgunDomain) {
              problems.push(' • Mailgun domain is missing from this app\'s configuration (`sails.config.custom.mailgunDomain`)');
            }
            return problems.join('\n');
          })()}
  To resolve these configuration issues, add the missing config variables to
  \`config/custom.js\`-- or in staging/production, set them up as system
  environment vars.  (If you don't have a Mailgun domain or secret, you can
  sign up for free at https://mailgun.com to receive sandbox credentials.)
  > Note that, for convenience during development, there is another alternative:
  > In lieu of setting up real Mailgun credentials, you can "fake" email
  > delivery by using any email address that ends in "@example.com".  This will
  > write automated emails to your logs rather than actually sending them.
  > (To simulate clicking on a link from an email, just copy and paste the link
  > from the terminal output into your browser.)
   [?] If you're unsure, visit https://sailsjs.com/support`);
      }

      sails.log('sending template email 3', inputs);
      sails.log('htmlEmailContents', htmlEmailContents);

      var API_KEY = sails.config.custom.mailgunSecret;
      var DOMAIN = sails.config.custom.mailgunDomain;

      const formData = require('form-data');
      const Mailgun = require('mailgun.js');
      const mailgun = new Mailgun(formData);
      const mg = mailgun.client({ username: 'api', key: API_KEY });

      //  ({apiKey: API_KEY, domain: DOMAIN});

      // await sails.helpers.mailgun.sendHtmlEmail.with({
      //   htmlMessage: htmlEmailContents,
      //   to: inputs.to,
      //   subject: inputs.subject,
      //   testMode: false,
      // });
      // let data =
      // {
      //   html: htmlEmailContents,
      //   to: inputs.to,
      //   subject: inputs.subject,
      //   testMode: false,
      //   from: 'admin@hagenfamilyfoundation.org'
      // }
      // await mailgun.messages().send(data)


      await mg.messages.create(DOMAIN, {
        from: "admin@hagenfamilyfoundation.org",
        to: [inputs.to],
        subject: inputs.subject,
        // text: "Testing some Mailgun awesomness!",
        html: htmlEmailContents
      })

      sails.log('sending template email 4', inputs);
    }// ﬁ

    // All done!
    return exits.success({
      loggedInsteadOfSending: isToAddressConsideredFake,
    });
  },

};
