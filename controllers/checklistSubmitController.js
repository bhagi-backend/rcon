const express = require("express");
const { catchAsync } = require("../utils/catchAsync");
const checkListSubmit = require("../models/checkListSubmitModel");
exports.createOne = catchAsync(async (req, res, next) => {
 
  if (!req.user || !req.user.id) {
    return res.status(400).json({ status: 'fail', message: 'User ID is required' });
  }
  req.body.addedBy = req.user;
  console.log(req.body);
  const newForm = await checkListSubmit.create(req.body);
  res.status(201).json({
    status: "success",
    data: newForm,
  });
});
exports.getAll = catchAsync(async (req, res, next) => {
  const allCheckList = await checkListSubmit
    .find()
    .populate("checkListFormId")
    .populate("addedBy")
    .populate("siteName");

  res.status(200).json({
    status: "success",
    results: allCheckList.length,
    data: {
      checklists: allCheckList,
    },
  });
});
exports.updateOne = catchAsync(async (req, res, next) => {
  const newOne = await checkListSubmit.findById(req.params.id, req.body);
  res.status(200).json({
    status: "success",
    data: {
      newData: newOne,
    },
  });
});
exports.fetchApproved =  catchAsync(async (req, res, next) => {
  try {
    const fetchOne = await checkListSubmit.find()
    .populate("checkListFormId")
    .populate("addedBy")
    .populate("approvedBy")
    .populate("siteName");
   
       console.log(fetchOne);
      const newArray = fetchOne.filter(el => el.approvedBy.length > 0);
      res.status(200).json({
        status: "success",
        data: newArray,
      });
    
  } catch (err) {
    return res.status(404).json({
      status: "fail",
      message: "invalid id",
    });
  }
});


