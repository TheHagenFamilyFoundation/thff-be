
import { Router } from "express";

import AuthRouter from './auth.js'

import PingRouter from './ping.js'

import UserRouter from './user.js'

import OrganizationRouter from './organization.js'
import OrganizationInfoRouter from './organization-info.js'
import Organization501c3Router from './organization-501c3.js'

import ProposalRouter from './proposal.js'

import VoteRouter from './vote.js'

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

export default router;
