const express = require("express");
const { catchAsync } = require("../utils/catchAsync");
const checkListModel = require("../models/checkListModel");

exports.createOne = catchAsync(async (req, res, next) => {
  const { category, department } = req.body;

  // Validate the presence of category and department
  if (!category || !department) {
    return next(new AppError("Category and department are required fields.", 400));
  }

  // Ensure formid is generated
  const count = await checkListModel.countDocuments();
  const categoryPrefix = category.substring(0, 2).toUpperCase();
  const departmentPrefix = department.substring(0, 2).toUpperCase();
  req.body.formid = `${categoryPrefix}${departmentPrefix}${count + 1}`;

  const newForm = await checkListModel.create(req.body);
  res.status(201).json({
    status: "success",
    data: newForm,
  });
});

exports.getAll = catchAsync(async (req, res, next) => {
  const { type } = req.query;

  // Build the filter object
  let filter = {};
  if (type === 'form') {
    filter = { 'description.0': { $exists: true, $ne: '' } };
  }

  const allCheckList = await checkListModel.find(filter);
  res.status(200).json({
    status: "success",
    results: allCheckList.length,
    data: {
      data: allCheckList,
    },
  });
});

exports.getFormById = catchAsync(async (req, res, next) => {
  try {
    const form = await checkListModel.findById(req.params.id);
    if (!form) {
      return next(new AppError("No machine found with that id ", 404));
    }
    res.status(200).json({
      status: "success",
      data: form,
    });
  } catch (err) {
    return res.status(404).json({
      status: "fail",
      message: "invalid id",
    });
  }
});


exports.updateOne = catchAsync(async (req, res, next) => {
  const updatedForm = await checkListModel.findByIdAndUpdate(
    req.params.id,
    {$set: req.body},
    {
      new: true, // return the updated document
      runValidators: true, // run schema validators on update
    }
  );

  if (!updatedForm) {
    return res.status(404).json({
      status: "fail",
      message: "No document found with that ID",
    });
  }

  res.status(200).json({
    status: "success",
    data: {
      data: updatedForm,
    },
  });
});
