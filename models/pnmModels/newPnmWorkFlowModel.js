const mongoose = require("mongoose");
const validator = require("validator");
const express = require("express");


const newPnmWorkFlowSchema = new mongoose.Schema({
  
  companyId:
    {
      type: mongoose.Schema.ObjectId,
      ref: "Company",
      required: true,
    },
    assignTOUser: {
        type: mongoose.Schema.ObjectId,
        ref: "User",
      },

  assignNewPnmTasks: [{
        type: mongoose.Schema.ObjectId,
        ref: "NewPnm",
      }],
  
});

const NewPnmWorkFlow = mongoose.model("NewPnmWorkFlow", newPnmWorkFlowSchema);
module.exports = NewPnmWorkFlow;