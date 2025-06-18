const mongoose = require("mongoose");
const validator = require("validator");

const assignNewPnmsSchema = new mongoose.Schema({
  assignNewPnmTasks:{
    type: mongoose.Schema.ObjectId,
    ref: "NewPnm",
  },
  assignedDate: {
    type: Date, 
  },
  
  status: {
    type: String,
    enum: ["permanent task","temporary task"],
     
  },
  checklistResponse:{
    type: mongoose.Schema.ObjectId,
    ref: "ChecklistResponse",
  },
  
  newPnmTaskStatus: {
    type: String,
    enum: ["ToDo","Delayed","In Progress", "Re Do","Completed"],
    default:"ToDo"
    
  },
  reDoDate: {
    type: Date, 
  },
  startDate: {
    type: Date, 
  },
  title: {
    type: String,
   
  },
  delayReason: {
    type: String,
   
  },
  delayImage: {
    type: String,
   
  },

  
});

const TaskSchema = new mongoose.Schema({
 
  
  assignTo: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
  },
  siteId: {
    type: mongoose.Schema.ObjectId,
    ref: "Site",
  },
  
  assignnewPnmTasksForUser:[{
    type: assignNewPnmsSchema,
    default: {}
  }],
 
  
});

const Task = mongoose.model("Task", TaskSchema);
module.exports = Task;

