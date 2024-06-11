import { validationResult } from "express-validator";

import SubmissionYear from "../../models/submission-year.js";

import Logger from "../../utils/logger.js";
import { generateCode } from "../../utils/util.js";

export const getSubmissionYears = async (req, res) => {
  Logger.verbose('Inside getSubmissionYears');

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    Logger.error(`We have Errors: ${errors.array()}`)
    return res.status(422).json({ error: errors.array() });
  }

  try {
    let { limit, skip, filter, sort, dir } = req.query;

    let query = {};

    if (filter && filter.length !== 0) {
      query = { name: { $regex: filter } };
    }

    //return all submission years
    let submissionYears = await SubmissionYear.find(query)

    //sort
    //for notes
    // ASC  -> a.length - b.length
    // DESC -> b.length - a.length
    switch (sort) {

      case 'createdOn':
        submissionYears.sort(function (a, b) {
          return dir === 'asc' ? (new Date(a.createdAt) - new Date(b.createdAt)) : (new Date(b.createdAt) - new Date(a.createdAt));
        });
        break;
      // case 'year': //name
      //   if (dir === 'asc') {
      //     submissionYears.sort((a, b) => b.name.localeCompare(a.name));
      //   }
      //   else {
      //     submissionYears.sort((a, b) => a.name.localeCompare(b.name))
      //   }
      //   break;
    }

    //skip and limit
    let subYears = submissionYears.slice(skip, +skip + +limit);

    return res.status(200).json(subYears);
  }
  catch (err) {
    Logger.error(`Error Retrieving Submission Years ${err.message}`);
    return res.status(400).send({ code: "SUBY003", message: err.message });
  }

}

export const getSubmissionYear = async (req, res) => {
  Logger.verbose('Inside getSubmissionYear');

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    Logger.error(`We have Errors: ${errors.array()}`)
    return res.status(422).json({ error: errors.array() });
  }

  const { id } = req.params;
  const query = { _id: id };

  const submissionYear = await SubmissionYear.findOne(query);

  return res.status(200).json(submissionYear);
}

export const createSubmissionYear = async (req, res) => {
  Logger.verbose('Inside createSubmissionYear');

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    Logger.error(`We have Errors: ${errors.array()}`)
    return res.status(422).json({ error: errors.array() });
  }

  try {

    let year = new Date().getFullYear();

    let query = {
      year
    };
    let submissionYear = await SubmissionYear.find(query);

    if (submissionYear.length > 0) {
      Logger.info('Submission Year Already Created');
      return res
        .status(400)
        .send({ code: "SUBY004", message: "Duplicate Submission Year" });
    }

    let newSubmissionYear = {
      subID: generateCode(),
      year,
      active: true
    }

    let createdSubmissionYear = await SubmissionYear.create(newSubmissionYear);
    Logger.info("createdSubmissionYear", createdSubmissionYear);

    // notification

    return res.status(200).json(createdSubmissionYear);
  } catch (e) {
    if (e.code === 11000) {
      console.error('Duplicate key error. Document already exists!');
      return res
        .status(400)
        .send({ code: "SUBY004", message: "Duplicate Submission Year" });
    }

    //generic error creating submission year
    Logger.error('Error creating submission year');
    return res.status(500).json(e.message);
  }

}

export const toggleSubmissionYear = async (req, res) => {
  Logger.verbose('Inside toggleSubmissionYear');

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    Logger.error(`We have Errors: ${errors.array()}`)
    return res.status(422).json({ error: errors.array() });
  }

  let { _id, active } = req.body;

  const submissionYear = await SubmissionYear.findByIdAndUpdate(_id, { active }, { new: true })
  Logger.info("submissionYear toggled", submissionYear);

  return res.status(200).json(submissionYear);
}

export const countSubmissionYears = async (req, res) => {
  try {
    // const { filter } = req.query;

    let query = {};
    // if (filter && filter.length !== 0) {
    //   query = { name: { $regex: filter } };
    // }
    const count = await SubmissionYear.find(query).count();
    return res.status(200).json(count);
  }
  catch (err) {
    Logger.error(`Error Retrieving Submission Year Count: ${err}`);
    return res.status(400).send({ code: "SUBY002", message: err.message });
  }

}
