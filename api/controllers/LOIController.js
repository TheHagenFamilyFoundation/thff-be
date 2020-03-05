/**
 * LOIController
 *
 * @description :: Server-side logic for managing LOIS
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

const emailController = require('./EmailController');
const submissionYearController = require('./SubmissionYearController');

module.exports = {

  create(req, res) {
    sails.log('loi create');

    sails.log('req.body', req.body);

    const loi = req.body; // loi

    const orgID = loi.org;

    // create loiID
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < 5; i += 1) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }

    const loiID = text;
    // add loiID to loi object - loi

    loi.loiID = loiID;

    const query = {};
    query.organizationID = orgID;

    Organization.find(query).then((org) => {
      sails.log('found org', org);
      sails.log('found org', org[0].id);

      loi.organization = org[0].id;

      sails.log(loi);

      LOI.create(loi).then((newLOI, err) => {
        sails.log('LOI.create');

        if (err) {
          return res.status(err.status).json({ err });
        }

        // loi is filled with organization new data..
        sails.log('LOI data has been created', newLOI, orgID);

        return res.json({ status: true, result: newLOI });
      });
    });
  },
  async getLOIs(req, res) {
    console.log('getLOIs');

    const query = {};

    const lois = await LOI.find(query).populate('votes').populate('organization').populate('info');

    const votedLOI = [];

    lois.forEach((loi) => {
      loi.score = 0;

      if (loi.votes.length > 0) {
        loi.votes.forEach((vote) => {
          // -1 means they have not voted
          if (vote.voteType === 'Director' && vote.vote !== -1) {
            loi.score += vote.vote;
          }
        });
      } else {
        // move on
      }
    });

    return res.status(200).json(lois);
  },
  // flipping the field submitted and update the submittedOn with time stamp
  async submitLOI(req, res) {
    sails.log('submitLOI', req.params);

    const { loiID } = req.params;

    // get currentYear and find the submission year
    const today = new Date();
    const currentYear = today.getFullYear();

    const syQuery = {
      year: currentYear,
    };

    const sy = await SubmissionYear.find(syQuery);

    sails.log('sy', sy);


    const loi = await LOI.update({ loiID })
      .set({
        submitted: true,
        submittedOn: (new Date()).toJSON(),
        status: 2, // submitted
        submissionYear: sy[0].id,
      })
      .fetch();

    // can be removed
    sails.log('loi', loi);

    const query = { username: loi[0].username };
    const user = await User.find(query);

    const body = {
      user: user[0],
      loi: loi[0],
    };

    const sendEmail = await emailController.sendSubmitLOI(body);

    return res.status(200).json({ message: 'Loi submitted' });
  },

  async nextLOI(req, res) {
    sails.log('nextLOI ts', req.query.ts);
    sails.log('nextLOI filter', req.query.filter);
    sails.log('nextLOI user', req.query.user);

    const timeStamp = req.query.ts;
    const query = {
      where: { createdAt: { '>': timeStamp } },
      sort: 'createdAt ASC',
    };

    sails.log('nextLOI - query', query);

    // query
    const lois = await LOI.find(query).populate('votes');

    sails.log('next - lois count ', lois.length);
    let nextLOIs = [];
    if (req.query.filter === 1) {
      lois.forEach((loi) => {
        loi.votes.forEach((vote) => {
          if (vote.voteType === 'President' && vote.vote === 1) {
            nextLOIs.push(loi);
          }
        });
      });
    } else if (req.query.filter === 2) {
      lois.forEach((loi) => {
        loi.votes.forEach((vote) => {
          if (vote.voteType === 'President' && vote.vote === 2) {
            nextLOIs.push(loi);
          }
        });
      });
    } else if (req.query.filter === 3) {
      lois.forEach((loi) => {
        let hasVoted = false;
        loi.votes.forEach((vote) => {
          if (vote.userID === req.query.user) {
            hasVoted = true;
          }
        });

        if (!hasVoted) {
          nextLOIs.push(loi);
        }
      });
    } else {
      // default
      sails.log('default next letter');
      nextLOIs = lois;
    }

    const nextLetter = nextLOIs[0];
    sails.log('nextLetter', nextLetter);
    // return the next Letter of Intent
    return res.status(200).json(nextLetter);
  },

  async prevLOI(req, res) {
    sails.log('prevLOI ts', req.query.ts);
    sails.log('prevLOI filter', req.query.filter);
    sails.log('prevLOI user', req.query.user);

    const timeStamp = req.query.ts;
    const query = {
      where: { createdAt: { '<': timeStamp } },
      sort: 'createdAt DESC',
    };

    sails.log('prevLOI - query', query);

    // query
    const lois = await LOI.find(query).populate('votes');

    sails.log('prev - lois count', lois.length);
    let prevLOIs = [];
    if (req.query.filter === 1) {
      lois.forEach((loi) => {
        loi.votes.forEach((vote) => {
          if (vote.voteType === 'President' && vote.vote === 1) {
            prevLOIs.push(loi);
          }
        });
      });
    } else if (req.query.filter === 2) {
      lois.forEach((loi) => {
        loi.votes.forEach((vote) => {
          if (vote.voteType === 'President' && vote.vote === 2) {
            prevLOIs.push(loi);
          }
        });
      });
    } else if (req.query.filter === 3) {
      lois.forEach((loi) => {
        let hasVoted = false;
        loi.votes.forEach((vote) => {
          if (vote.userID === req.query.user) {
            hasVoted = true;
          }
        });

        if (!hasVoted) {
          prevLOIs.push(loi);
        }
      });
    } else {
      // default
      prevLOIs = lois;
    }

    const prevLetter = prevLOIs[0];

    sails.log('prevLetter', prevLetter);

    // return the next Letter of Intent
    return res.status(200).json(prevLetter);
  },

  // returns a list of unsubmitted LOI - modified with email
  async getUnSubmittedLOI(req, res) {
    const query = {
      submitted: false,
    };

    const lois = await LOI.find(query).populate('votes').populate('organization').populate('info');

    sails.log('lois count', lois.length);

    const users = [];
    lois.forEach((loi) => {
      users.push(loi.userid);
    });

    const userQuery = {
      id: users,
    };

    const userDocs = await User.find(userQuery);
    const emails = [];
    userDocs.forEach((userDoc) => {
      emails.push(userDoc.email);
    });

    return res.status(200).json(emails);
  },
  // return LOIs that president has voted on
  async presVotes(req, res) {
    sails.log('pres votes', req.query.vote);

    const query = {};

    const lois = await LOI.find(query).populate('votes').populate('organization').populate('info');

    const presLOIs = [];

    lois.forEach((loi) => {
      loi.score = 0;

      if (loi.votes.length > 0) {
        loi.votes.forEach((vote) => {
          if (vote.voteType === 'Director' && vote.vote !== -1) {
            loi.score += vote.vote;
          }

          if (req.query.vote) {
            if (vote.voteType === 'President' && vote.vote === req.query.vote) {
              presLOIs.push(loi);
            }
          } else if (vote.voteType === 'President') {
            presLOIs.push(loi);
          }
        });
      }
    });

    return res.status(200).json(presLOIs);
  },

  // return LOIs that director has not voted on
  async pendingVotes(req, res) {
    sails.log('pending votes', req.query);

    const query = {};

    const lois = await LOI.find(query).populate('votes').populate('organization').populate('info');

    const pendingVotes = [];

    lois.forEach((loi) => {
      let hasVoted = false;

      loi.score = 0;

      if (loi.votes.length > 0) {
        loi.votes.forEach((vote) => {
          if (vote.userID === req.query.user) {
            hasVoted = true;
          }

          if (vote.voteType === 'Director' && vote.vote !== -1) {
            loi.score += vote.vote;
          }
        });

        if (!hasVoted) {
          pendingVotes.push(loi);
        }
      }
    });

    return res.status(200).json(pendingVotes);
  },

  async getRankedLOIs(req, res) {
    // asc <-- most likely
    // desc

    const query = {};
    const presLois = [];

    const lois = await LOI.find(query).populate('votes').populate('organization').populate('info');

    sails.log('lois count', lois.length);

    lois.forEach((loi) => {
      loi.score = 0;
      let presVoted = false;

      if (loi.votes.length > 0) {
        loi.votes.forEach((vote) => {
          // -1 means they have not voted
          if (vote.voteType === 'Director' && vote.vote !== -1) {
            loi.score += vote.vote;
          }

          if (vote.voteType === 'President' && vote.vote === 1) {
            presVoted = true;
          }
        });
      } else {
        // move on
      }

      if (presVoted) {
        presLois.push(loi);
      }

      //             sails.log('after - score - loi', loi)
    });

    // sort
    presLois.sort((a, b) => b.score - a.score);

    return res.status(200).json(presLois);
  },

  // individual turn on full proposal
  async loiFP(req, res) {
    // open or close
    sails.log('loiFP', req.body);
    // true or false

    const loi = await LOI.update({ id: req.body.id })
      .set({
        openFp: req.body.open,
      })
      .fetch();

    return res.status(200).json(loi[0]);
  },

  // open the links to the full proposals
  // need date
  async openFPs(req, res) {
    sails.log('openFPs - body', req.body);
    sails.log('openFPs - body.open', req.body.open);

    sails.log('openFPs - Submission Year OBJ', req.body.sy);
    // true or false

    // lois that are tied to that submission year
    const query = {
      where: { openFp: req.body.open, submissionYear: req.body.sy.id },
    };

    sails.log('openFPs - query', query);

    // debugging
    // var lois = await LOI.find(query)

    const lois = await LOI.update(query)
      .set({
        status: 6,
      })
      .fetch();

    sails.log('lois.length', lois.length);

    // updates the submission Year field

    // TODO
    if (req.body.open === true) {
      const sy = await submissionYearController.openFullProposalPortal(req.body.sy);
    } else {
      const sy = await submissionYearController.closeFullProposalPortal(req.body.sy);
    }

    return res.status(200).json(lois);
  },

  // set the rejected
  // need date
  // future - send email as well
  async notifyReject(req, res) {
    sails.log('notifyReject', req.body); // does not need req.body

    const today = new Date();
    const currentYear = today.getFullYear();

    const november1st = new Date(currentYear - 1, 10, 1);
    const nextNovember1st = new Date(currentYear + 1, 10, 1);

    sails.log('november', november1st);

    // ignore submitted false
    // only reject the submitted for this year
    const query = {
      where: {
        // TODO
        submitted: true, openFp: false, submittedOn: { '>': november1st }, submittedOn: { '<': nextNovember1st },
      },
    };

    // debugging
    const lois = await LOI.find(query);

    // uncomment when ready
    // var lois = await LOI.update({ openFP: false })
    //     .set({
    //         status: 5
    //     })
    //     .fetch();

    sails.log('lois.length', lois.length);

    return res.status(200).json(lois);
  },

};
