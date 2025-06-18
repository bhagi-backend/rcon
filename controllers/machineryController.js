const Machinary = require("../models/machineryModel");
const express = require("express");
const { query } = require("express");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync").catchAsync;

exports.getAllMachinery= catchAsync(async (req, res) => {
  try {
    const machinary = await Machinary.find({});
    res.status(200).json({
      status: "success",
      data: {
        machinary,
      },
    });
  } catch (err) {
    res.status(404).json({
      status: "failed",
      msg:  err.toString(),
    });
  }
});
exports.getMachine = catchAsync(async (req, res) => {
  try {
    const machine = await Machinary.findById(req.params.id);
    if (!machine) {
      return next(new AppError("No machine found with that id ", 404));
    }
    res.status(200).json({
      status: "success",
      data: machine,
    });
  } catch (err) {
    return res.status(404).json({
      status: "fail",
      message: "invalid id",
    });
  }
});

exports.createMachinery = catchAsync(async (req, res) => {
  try{
  const newMachine = await Machinary.create(req.body);
  res.status(201).json({
    status: "success",
    machine: newMachine,
  });
} catch (err) {
  res.status(404).json({
    status: "failed",
    msg:  err.toString(),
  });
}
});
