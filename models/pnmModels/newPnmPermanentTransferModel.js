const mongoose = require("mongoose");
const validator = require("validator");
const express = require("express");
const assignToAnotherUsersSchema = new mongoose.Schema({
  assignedToUser: {
        type: mongoose.Schema.ObjectId,
        ref: "User",
      },

  assignNewPnmTasks: [{
        type: mongoose.Schema.ObjectId,
        ref: "NewPnm",
      }],
  });

const newPnmPermanentTransferSchema = new mongoose.Schema({
  
  companyId:
    {
      type: mongoose.Schema.ObjectId,
      ref: "Company",
      required: true,
    },
    user: {
        type: mongoose.Schema.ObjectId,
        ref: "User",
      },

  assignNewPnmTasks: [{
        type: mongoose.Schema.ObjectId,
        ref: "NewPnm",
      }],
      assignToAnotherUser:[{
        type: assignToAnotherUsersSchema,
       
      }],
  
});

const NewPnmPermanentTransfer = mongoose.model("NewPnmPermanentTransfer", newPnmPermanentTransferSchema);
module.exports = NewPnmPermanentTransfer;