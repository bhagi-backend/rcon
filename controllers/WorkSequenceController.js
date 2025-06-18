const WorkSequence = require("../models/workSequenceModel");
const express = require("express");
const { query } = require("express");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync").catchAsync;

exports.createWorkSequence = catchAsync(async (req, res) => {
  try {
    const { names, category, siteId } = req.body;

    if (!Array.isArray(names) || names.length === 0) {
      return res.status(400).json({
        status: 'fail',
        message: 'Names must be an array with at least one name'
      });
    }

    const createdWorkSequences = [];
    for (let i = 0; i < names.length; i++) {
      const newName = names[i];

      const newWorkSequence = new WorkSequence({
        name: newName, // Assuming your schema field is 'name' for individual names
        category,
        siteId
      });

      const savedWorkSequence = await newWorkSequence.save();
      createdWorkSequences.push(savedWorkSequence);
    }

    res.status(201).json({
      status: 'success',
      data: {
        workSequences: createdWorkSequences
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
});

exports.getAllWorkSequence = async (req, res) => {
    try {
      const Work = await WorkSequence.find({}).populate('siteId');
      res.status(200).json({
        status: "success",
        data: {
            Work,
        },
      });
    } catch (err) {
      res.status(404).json({
        status: "failed",
        msg: err,
      });
    }
};

exports.getWorkSequence = async (req, res) => {
    try {
      const work = await WorkSequence.findById(req.params.id).populate('siteId');
      if (!work) {
        return next(new AppError("No info found with that id ", 404));
      }
      res.status(200).json({
        status: "success",
        data: work,
      });
    } catch (err) {
      return res.status(404).json({
        status: "fail",
        message: "invalid id",
      });
    }
  };
  exports.getWorkSequenceBySiteId = catchAsync(async (req, res, next) => {
    const workSequences = await WorkSequence.find({ siteId: req.params.siteId }).populate('siteId');
  
    if (!workSequences.length) {
      return next(new AppError("No work sequences found with that site ID", 404));
    }
  
    res.status(200).json({
      status: "success",
      data: {
        workSequences,
      },
    });
  });

