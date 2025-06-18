const WorkSequenceDocument = require("../models/workSequenceDocumentModel");
const express = require("express");
const { query } = require("express");
const AppError = require("../utils/appError");
const { catchAsync } = require("../utils/catchAsync");

exports.getAllDocuments = catchAsync(async (req, res, next) => {
  const documents = await WorkSequenceDocument.find();
  res.status(200).json({
    status: "success",
    results: documents.length,
    data: {
      documents
    }
  });
});

exports.getDocument = catchAsync(async (req, res, next) => {
  const document = await WorkSequenceDocument.findById(req.params.id);
  if (!document) {
    return next(new AppError("No document found with that ID", 404));
  }
  res.status(200).json({
    status: "success",
    data: {
      document
    }
  });
});

exports.createDocument = catchAsync(async (req, res, next) => {
  const documentsData = req.body;

  // Validate the incoming data format
  if (!Array.isArray(documentsData)) {
    return next(new AppError('Request body should be an array', 400));
  }

  const createdDocuments = [];

  // Iterate over each document in the array
  for (let i = 0; i < documentsData.length; i++) {
    const doc = documentsData[i];

    // Validate each document
    if (!doc.workSequenceId || !doc.checklists || !Array.isArray(doc.checklists)) {
      return next(new AppError(`Invalid data format at index ${i}`, 400));
    }

    // Create a new WorkSequenceDocument instance
    const newDocument = new WorkSequenceDocument({
      workSequenceId: doc.workSequenceId,
      checklists: doc.checklists
    });

    // Save the document to the database
    const savedDocument = await newDocument.save();
    createdDocuments.push(savedDocument);
  }

  res.status(201).json({
    status: 'success',
    data: {
      documents: createdDocuments
    }
  });
});