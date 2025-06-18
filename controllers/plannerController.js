const Planner = require("../models/plannerModel");
const express = require("express");
const { query } = require("express");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync").catchAsync;

exports.getAllPlans = async (req, res) => {
  try {
    const allPlans = await Planner.find({}).populate("AssignedName");
    res.status(200).json({
      status: "success",
      len: allPlans.length,
      data: {
        allPlans,
      },
    });
  } catch (err) {
    res.status(404).json({
      status: "failed",
      msg: err,
    });
  }
};

exports.getPlan = async (req, res) => {
  try {
    const plan = await Planner.findById(req.params.id).populate("AssignedName");
    if (!plan) {
      return next(new AppError("No machine found with that id ", 404));
    }
    res.status(200).json({
      status: "success",
      data: plan,
    });
  } catch (err) {
    return res.status(404).json({
      status: "fail",
      message: "invalid id",
    });
  }
};
exports.createPlan = catchAsync(async (req, res) => {
  req.body.AssignedName = req.user;
  const newPlan = await Planner.create(req.body);
  res.status(201).json({
    status: "success",
    machine: newPlan,
  });
});
exports.update = catchAsync(async (req, res) => {
  const ip = await Planner.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  res.status(201).json({
    status: "success",
    newPlan: ip,
  });
});
