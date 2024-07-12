
import { Router } from "express";

import AuthRouter from './api/auth.js'

import PingRouter from './api/ping.js'

import UserRouter from './api/user.js'

import OrganizationRouter from './api/organization.js'
import OrganizationInfoRouter from './api/organization-info.js'
import Organization501c3Router from './api/organization-501c3.js'

import ProposalRouter from './api/proposal.js'

import VoteRouter from './api/vote.js'

import SubmissionYearRouter from './api/submission-year.js'

import AuthnMiddleware from '../middlewares/authn.js'

const router = new Router();

//auth
router.use('/auth', AuthRouter)

  .use(AuthnMiddleware.authenticateToken)

  .use(PingRouter)

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

  //submission years
  .use('/submission-year', SubmissionYearRouter)

export default router;
