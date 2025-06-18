const PreDrawing = require("../models/preDrawingModel");
const express = require("express");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync").catchAsync;

exports.createPreDrawing = catchAsync(async (req, res, next) => {
    const newPreDrawing = await PreDrawing.create(req.body);
    res.status(201).json({
      status: 'success',
      data: newPreDrawing
    });
  });
  
  exports.getAllPreDrawings = catchAsync(async (req, res, next) => {
    const preDrawings = await PreDrawing.find({});
    res.status(200).json({
      status: 'success',
      data: preDrawings
    });
  });