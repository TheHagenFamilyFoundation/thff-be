/**
 * custom hook
 *
 * @description :: A hook definition.  Extends Sails by adding shadow routes, implicit actions, and/or initialization logic.
 * @docs        :: https://sailsjs.com/docs/concepts/extending-sails/hooks
 */

module.exports = function defineCustomHook(sails) {

    return {

        /**
         * Runs when a Sails app loads/lifts.
         *
         * @param {Function} done
         */
        initialize: async function (done) {

            sails.log.info('Initializing hook... (`api/hooks/custom`)');

            // Check Mailgun configuration (for emails).
            var MANDATORY_MAILGUN_CONFIG = ['mailgunSecret', 'mailgunDomain', 'internalEmailAddress'];
            var isMissingMailgunConfig = _.difference(MANDATORY_MAILGUN_CONFIG, Object.keys(sails.config.custom)).length > 0;

            if (isMissingMailgunConfig) {

                let missingFeatureText = 'email';
                let verboseSuffix = '';
                if (_.includes(['verbose', 'silly'], sails.config.log.level)) {
                    verboseSuffix =
                        `
  > Tip: To exclude sensitive credentials from source control, use:
  > • config/local.js (for local development)
  > • environment variables (for production)
  >
  > If you want to check them in to source control, use:
  > • config/custom.js  (for development)
  > • config/env/staging.js  (for staging)
  > • config/env/production.js  (for production)
  >
  > (See https://sailsjs.com/docs/concepts/configuration for help configuring Sails.)
  `;
                }

                let problems = [];
                if (sails.config.custom.mailgunSecret === undefined) {
                    problems.push('No `sails.config.custom.mailgunSecret` was configured.');
                }
                if (sails.config.custom.mailgunDomain === undefined) {
                    problems.push('No `sails.config.custom.mailgunDomain` was configured.');
                }
                if (sails.config.custom.internalEmailAddress === undefined) {
                    problems.push('No `sails.config.custom.internalEmailAddress` was configured.');
                }

                sails.log.warn(
                    `Some optional settings have not been configured yet:
  ---------------------------------------------------------------------
  ${problems.join('\n')}
  Until this is resolved, this app's ${missingFeatureText} features
  will be disabled and/or hidden in the UI.
   [?] If you're unsure or need advice, come by https://sailsjs.com/support
  ---------------------------------------------------------------------${verboseSuffix}`);
            }//ﬁ

            // After "sails-hook-organics" finishes initializing, configure Mailgun packs with any available credentials.
            sails.after('hook:organics:loaded', () => {

                sails.helpers.mailgun.configure({
                    secret: sails.config.custom.mailgunSecret,
                    domain: sails.config.custom.mailgunDomain,
                    from: sails.config.custom.fromEmailAddress,
                    fromName: sails.config.custom.fromName,
                });

            });//_∏_

            // ... Any other app-specific setup code that needs to run on lift,
            // even in production, goes here ...

            return done();

        },


        routes: {

            /**
             * Runs before every matching route.
             *
             * @param {Ref} req
             * @param {Ref} res
             * @param {Function} next
             */
            before: {
                '/*': {
                    skipAssets: true,
                    fn: async function (req, res, next) {

                        // First, if this is a GET request (and thus potentially a view),
                        // attach a couple of guaranteed locals.
                        if (req.method === 'GET') {

                            // The  `_environment` local lets us do a little workaround to make Vue.js
                            // run in "production mode" without unnecessarily involving complexities
                            // with webpack et al.)
                            if (res.locals._environment !== undefined) {
                                throw new Error('Cannot attach Sails environment as the view local `_environment`, because this view local already exists!  (Is it being attached somewhere else?)');
                            }
                            res.locals._environment = sails.config.environment;

                            // The `me` local is set explicitly to `undefined` here just to avoid having to
                            // do `typeof me !== 'undefined'` checks in our views/layouts/partials.
                            // > Note that, depending on the request, this may or may not be set to the
                            // > logged-in user record further below.
                            if (res.locals.me !== undefined) {
                                throw new Error('Cannot attach view local `me`, because this view local already exists!  (Is it being attached somewhere else?)');
                            }
                            res.locals.me = undefined;

                        }//ﬁ

                        // No session? Proceed as usual.
                        // (e.g. request for a static asset)
                        if (!req.session) { return next(); }

                        // Not logged in? Proceed as usual.
                        if (!req.session.userId) { return next(); }

                        // Otherwise, look up the logged-in user.
                        var loggedInUser = await User.findOne({
                            id: req.session.userId
                        })
                            .populate('friends')
                            .populate('inboundFriendRequests')
                            .populate('outboundFriendRequests');

                        // If the logged-in user has gone missing, log a warning,
                        // wipe the user id from the requesting user agent's session,
                        // and then send the "unauthorized" response.
                        if (!loggedInUser) {
                            sails.log.warn('Somehow, the user record for the logged-in user (`' + req.session.userId + '`) has gone missing....');
                            delete req.session.userId;
                            return res.unauthorized();
                        }

                        // Add additional information for convenience when building top-level navigation.
                        // (i.e. whether to display "Dashboard", "My Account", etc.)
                        if (!loggedInUser.password || loggedInUser.emailStatus === 'unconfirmed') {
                            loggedInUser.dontDisplayAccountLinkInNav = true;
                        }

                        // Expose the user record as an extra property on the request object (`req.me`).
                        // > Note that we make sure `req.me` doesn't already exist first.
                        if (req.me !== undefined) {
                            throw new Error('Cannot attach logged-in user as `req.me` because this property already exists!  (Is it being attached somewhere else?)');
                        }
                        req.me = loggedInUser;

                        // If our "lastSeenAt" attribute for this user is at least a few seconds old, then set it
                        // to the current timestamp.
                        //
                        // (Note: As an optimization, this is run behind the scenes to avoid adding needless latency.)
                        var MS_TO_BUFFER = 60 * 1000;
                        var now = Date.now();
                        if (loggedInUser.lastSeenAt < now - MS_TO_BUFFER) {
                            User.update({ id: loggedInUser.id })
                                .set({ lastSeenAt: now })
                                .exec((err) => {
                                    if (err) {
                                        sails.log.error('Background task failed: Could not update user (`' + loggedInUser.id + '`) with a new `lastSeenAt` timestamp.  Error details: ' + err.stack);
                                        return;
                                    }//•
                                    sails.log.verbose('Updated the `lastSeenAt` timestamp for user `' + loggedInUser.id + '`.');
                                    // Nothing else to do here.
                                });//_∏_  (Meanwhile...)
                        }//ﬁ


                        // If this is a GET request, then also expose an extra view local (`<%= me %>`).
                        // > Note that we make sure a local named `me` doesn't already exist first.
                        // > Also note that we strip off any properties that correspond with protected attributes.
                        if (req.method === 'GET') {
                            if (res.locals.me !== undefined) {
                                throw new Error('Cannot attach logged-in user as the view local `me`, because this view local already exists!  (Is it being attached somewhere else?)');
                            }

                            // Exclude any fields corresponding with attributes that have `protect: true`.
                            var sanitizedUser = _.extend({}, loggedInUser);
                            for (let attrName in User.attributes) {
                                if (User.attributes[attrName].protect) {
                                    delete sanitizedUser[attrName];
                                }
                            }//∞

                            // If there is still a "password" in sanitized user data, then delete it just to be safe.
                            // (But also log a warning so this isn't hopelessly confusing.)
                            if (sanitizedUser.password) {
                                sails.log.warn('The logged in user record has a `password` property, but it was still there after pruning off all properties that match `protect: true` attributes in the User model.  So, just to be safe, removing the `password` property anyway...');
                                delete sanitizedUser.password;
                            }//ﬁ

                            res.locals.me = sanitizedUser;

                            // Include information on the locals as to whether billing features
                            // are enabled for this app, and whether email verification is required.
                            res.locals.isBillingEnabled = sails.config.custom.enableBillingFeatures;
                            res.locals.isEmailVerificationRequired = sails.config.custom.verifyEmailAddresses;

                        }//ﬁ

                        // Prevent the browser from caching logged-in users' pages.
                        // (including w/ the Chrome back button)
                        // > • https://mixmax.com/blog/chrome-back-button-cache-no-store
                        // > • https://madhatted.com/2013/6/16/you-do-not-understand-browser-history
                        res.setHeader('Cache-Control', 'no-cache, no-store');

                        return next();
                    }
                }
            }
        }


    };

};