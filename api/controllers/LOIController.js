/**
 * LOIController
 *
 * @description :: Server-side logic for managing LOIS
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var emailController = require('./EmailController')

module.exports = {

    create: function (req, res, next) {

        sails.log("loi create");

        sails.log('req.body', req.body)

        var loi = req.body; //loi

        let orgID = loi.org;

        //create loiID
        var text = "";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

        for (var i = 0; i < 5; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }

        var loiID = text;
        //add loiID to loi object - loi

        loi.loiID = loiID;

        let query = {};
        query.organizationID = orgID;

        Organization.find(query).then(function (org, err) {

            sails.log('found org', org)
            sails.log('found org', org[0].id)

            loi.organization = org[0].id;

            sails.log(loi)

            LOI.create(loi).then(function (newLOI, err) {
                sails.log("LOI.create")

                if (err) {
                    return res.status(err.status).json({ err: err });
                }

                // loi is filled with organization new data..
                sails.log("LOI data has been created", newLOI, orgID);

                return res.json({ 'status': true, 'result': newLOI });

            })

        })

    },
    getLOIs: async function (req, res, next) {

        let query = {};

        let lois = await LOI.find(query).populate('votes').populate('organization').populate('info')

        let votedLOI = [];

        lois.forEach((loi) => {

            loi.score = 0;

            if (loi.votes.length > 0) {

                loi.votes.forEach((vote) => {
                    //-1 means they have not voted
                    if (vote.voteType === 'Director' && vote.vote !== -1) {
                        loi.score += vote.vote
                    }

                })

            }
            else {
                //move on
            }

        })

        return res.status(200).json(lois);

    },
    //flipping the field submitted and update the submittedOn with time stamp
    submitLOI: async function (req, res, next) {

        sails.log('submitLOI', req.params)

        let loiID = req.params.loiID;

        var loi = await LOI.update({ loiID: loiID })
            .set({
                submitted: true,
                submittedOn: (new Date()).toJSON(),
                status: 2 //submitted
            })
            .fetch();

        //can be removed
        sails.log('loi', loi)

        var query = { username: loi[0].username }
        var user = await User.find(query);

        var body = {
            user: user[0],
            loi: loi[0]
        }

        var sendEmail = await emailController.sendSubmitLOI(body);

        return res.status(200).json({ message: 'Loi submitted' })
    },

    nextLOI: async function (req, res, next) {

        sails.log('nextLOI ts', req.query.ts)
        sails.log('nextLOI filter', req.query.filter)
        sails.log('nextLOI user', req.query.user)

        let timeStamp = req.query.ts;
        let query = {
            where: { createdAt: { '>': timeStamp } },
            sort: 'createdAt ASC'
        }

        sails.log('nextLOI - query', query)

        //query 
        let lois = await LOI.find(query).populate('votes')

        sails.log('next - lois count ', lois.length)
        let nextLOIs = [];
        if (req.query.filter == 1) {
            lois.forEach((loi) => {

                loi.votes.forEach((vote) => {

                    if (vote.voteType == 'President' && vote.vote == 1) {
                        nextLOIs.push(loi);
                    }

                })

            })

        }
        else if (req.query.filter == 2) {
            lois.forEach((loi) => {

                loi.votes.forEach((vote) => {

                    if (vote.voteType == 'President' && vote.vote == 2) {
                        nextLOIs.push(loi);
                    }

                })

            })
        }
        else if (req.query.filter == 3) {
            lois.forEach((loi) => {
                let hasVoted = false;
                loi.votes.forEach((vote) => {

                    if (vote.userID == req.query.user) {
                        hasVoted = true;
                    }

                })

                if (!hasVoted) {
                    nextLOIs.push(loi);
                }

            })
        }
        else {
            //default
            sails.log('default next letter')
            nextLOIs = lois;
        }

        let nextLetter = nextLOIs[0];
        sails.log('nextLetter', nextLetter)
        //return the next Letter of Intent
        return res.status(200).json(nextLetter)

    },

    prevLOI: async function (req, res, next) {

        sails.log('prevLOI ts', req.query.ts)
        sails.log('prevLOI filter', req.query.filter)
        sails.log('prevLOI user', req.query.user)

        let timeStamp = req.query.ts;
        let query = {
            where: { createdAt: { '<': timeStamp } },
            sort: 'createdAt DESC'
        }

        sails.log('prevLOI - query', query)

        //query 
        let lois = await LOI.find(query).populate('votes')

        sails.log('prev - lois count', lois.length)
        let prevLOIs = [];
        if (req.query.filter == 1) {
            lois.forEach((loi) => {

                loi.votes.forEach((vote) => {

                    if (vote.voteType == 'President' && vote.vote == 1) {
                        prevLOIs.push(loi);
                    }

                })

            })

        }
        else if (req.query.filter == 2) {
            lois.forEach((loi) => {

                loi.votes.forEach((vote) => {

                    if (vote.voteType == 'President' && vote.vote == 2) {
                        prevLOIs.push(loi);
                    }

                })

            })
        }
        else if (req.query.filter == 3) {
            lois.forEach((loi) => {
                let hasVoted = false;
                loi.votes.forEach((vote) => {

                    if (vote.userID == req.query.user) {
                        hasVoted = true;
                    }

                })

                if (!hasVoted) {
                    prevLOIs.push(loi);
                }

            })
        }
        else {
            //default
            prevLOIs = lois;
        }

        let prevLetter = prevLOIs[0];

        sails.log('prevLetter', prevLetter)

        //return the next Letter of Intent
        return res.status(200).json(prevLetter)
    },

    //returns a list of unsubmitted LOI - modified with email
    getUnSubmittedLOI: async function (req, res, next) {

        let query = {
            submitted: false
        }

        let lois = await LOI.find(query).populate('votes').populate('organization').populate('info')

        sails.log('lois count', lois.length)

        let users = [];
        lois.forEach(loi => {

            users.push(loi.userid)

        });

        let userQuery = {
            id: users
        }

        let userDocs = await User.find(userQuery)
        let emails = [];
        userDocs.forEach(userDoc => {
            emails.push(userDoc.email)
        })

        return res.status(200).json(emails)
    },
    //return LOIs that president has voted on
    presVotes: async function (req, res) {

        sails.log("pres votes", req.query.vote)

        let query = {};

        let lois = await LOI.find(query).populate('votes').populate('organization').populate('info')

        let presLOIs = [];

        lois.forEach((loi) => {

            loi.score = 0;

            if (loi.votes.length > 0) {

                loi.votes.forEach((vote) => {

                    if (vote.voteType === 'Director' && vote.vote !== -1) {
                        loi.score += vote.vote
                    }

                    if (req.query.vote) {
                        if (vote.voteType == 'President' && vote.vote == req.query.vote) {
                            presLOIs.push(loi);
                        }
                    }
                    else {
                        if (vote.voteType == 'President') {
                            presLOIs.push(loi);
                        }

                    }


                })

            }

        })

        return res.status(200).json(presLOIs);
    },

    //return LOIs that director has not voted on
    pendingVotes: async function (req, res) {

        sails.log("pending votes", req.query)

        let query = {};

        let lois = await LOI.find(query).populate('votes').populate('organization').populate('info')

        let pendingVotes = [];

        lois.forEach((loi) => {

            let hasVoted = false;

            loi.score = 0;

            if (loi.votes.length > 0) {

                loi.votes.forEach((vote) => {

                    if (vote.userID == req.query.user) {
                        hasVoted = true;
                    }

                    if (vote.voteType === 'Director' && vote.vote !== -1) {
                        loi.score += vote.vote
                    }

                })

                if (!hasVoted) {
                    pendingVotes.push(loi);
                }

            }

        })

        return res.status(200).json(pendingVotes);
    },

    getRankedLOIs: async function (req, res) {

        //asc <-- most likely
        //desc

        let query = {};
        let presLois = [];

        let lois = await LOI.find(query).populate('votes').populate('organization').populate('info')

        sails.log('lois count', lois.length)

        lois.forEach((loi) => {

            loi.score = 0;
            let presVoted = false;

            if (loi.votes.length > 0) {

                loi.votes.forEach((vote) => {
                    //-1 means they have not voted
                    if (vote.voteType === 'Director' && vote.vote !== -1) {
                        loi.score += vote.vote
                    }

                    if (vote.voteType === 'President' && vote.vote == 1) {
                        presVoted = true;
                    }

                })

            }
            else {
                //move on
            }

            if (presVoted) {
                presLois.push(loi)
            }

            //             sails.log('after - score - loi', loi)

        })

        //sort
        presLois.sort((a, b) => { return b.score - a.score })

        return res.status(200).json(presLois);
    },

    //individual turn on full proposal
    loiFP: async function (req, res) {

        //open or close
        sails.log('loiFP', req.body)
        //true or false

        let loiID = req.params.loiID;

        var loi = await LOI.update({ loiID: loiID })
            .set({
                openFp: req.body.openFP
            })
            .fetch();

        return res.status(200).json(loi);
    },

    //open the links to the full proposals
    //need date
    openFPs: async function (req, res) {

        sails.log('openFPs', req.body)
        //true or false

        var loi = await LOI.update({ openFP: true })
            .set({
                status: 6
            })
            .fetch();

        return res.status(200).json(loi);
    },

    //set the rejected 
    //need data
    //future - send email as well
    notifyReject: async function (req, res) {

        sails.log('notifyReject', req.body)

        var loi = await LOI.update({ openFP: false })
            .set({
                status: 5
            })
            .fetch();

        return res.status(200).json(loi);
    }

};

