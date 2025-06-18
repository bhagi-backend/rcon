const mongoose = require("mongoose");
const validator = require("validator");
const express = require("express");
const assignToAnotherUsersSchema = new mongoose.Schema({
    assignedToUser: {
        type: mongoose.Schema.ObjectId,
        ref: "User",
      },
      fromDate:{
        type: Date, 
      },
      toDate:{
        type: Date, 
      },

  assignNewPnmTasks: [{
        type: mongoose.Schema.ObjectId,
        ref: "NewPnm",
      }],
      
  });
  

const newPnmTemporaryTransferSchema = new mongoose.Schema({
  
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
      fromDate:{
        type: Date, 
      },
      toDate:{
        type: Date, 
      },

  Tasks: [{
        type: mongoose.Schema.ObjectId,
        ref: "NewPnm",
      }],
      assignToAnotherUser:[{
        type: assignToAnotherUsersSchema,
       
      }],
  
});

const NewPnmTemporaryTransfer = mongoose.model("NewPnmTemporaryTransfer", newPnmTemporaryTransferSchema);
module.exports = NewPnmTemporaryTransfer;