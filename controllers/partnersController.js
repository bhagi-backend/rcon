const express = require("express");
const catchAsync = require("../utils/catchAsync").catchAsync;
const Partners = require('../models/partnersModel'); 


// Create a new partner
exports.createPartner = catchAsync(async (req, res, next) => {
  const newPartner = await Partners.create(req.body);
  res.status(201).json({
    status: 'success',
    data: {
      partner: newPartner,
    },
  });
});

// Get all partners
exports.getAllPartners = catchAsync(async (req, res, next) => {
  const partners = await Partners.find();
  res.status(200).json({
    status: 'success',
    results: partners.length,
    data: {
      partners,
    },
  });
});

