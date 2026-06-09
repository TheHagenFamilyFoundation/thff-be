
import { Router } from "express";

import AuthRouter from './api/auth.js'

import UserRouter from './api/user.js'

import OrganizationRouter from './api/organization.js'
import OrganizationInfoRouter from './api/organization-info.js'
import Organization501c3Router from './api/organization-501c3.js'

import ProposalRouter from './api/proposal.js'

import VoteRouter from './api/vote.js'

import SettingsRouter from './api/settings.js'

import ReferralCodePublicRouter from './api/referral-code-public.js'
import ReferralCodeRouter from './api/referral-code.js'

import SubmissionYearPublicRouter from './api/submission-year-public.js'
import SubmissionYearRouter from './api/submission-year.js'

import MeetingRouter from './api/meeting.js'
import OutboundEmailRouter from './api/outbound-email.js'

import AuthnMiddleware from '../middlewares/authn.js'

const router = new Router();

//auth
router.use('/auth', AuthRouter)

  // Public submission year GET endpoints (no auth required)
  .use('/submission-year', SubmissionYearPublicRouter)

  // Public referral validation (sign-in / sign-up invite flows)
  .use('/referral-code', ReferralCodePublicRouter)

  .use(AuthnMiddleware.authenticateToken)

  //user
  .use('/user', UserRouter)

  //organization
  .use('/organization', OrganizationRouter)

  //organization-info
  .use('/organization-info', OrganizationInfoRouter)

  //organization 501c3
  .use('/organization-501c3', Organization501c3Router)

  //proposals
  .use('/proposal', ProposalRouter)

  //votes
  .use('/vote', VoteRouter)

  //settings
  .use('/settings', SettingsRouter)

  //referral codes
  .use('/referral-code', ReferralCodeRouter)

  // Protected submission year POST/PUT endpoints (auth required)
  .use('/submission-year', SubmissionYearRouter)

  //meetings
  .use('/meeting', MeetingRouter)

  // outbound email log / solicitation / grant notifications
  .use('/outbound-email', OutboundEmailRouter)

export default router;
