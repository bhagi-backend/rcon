const mongoose = require("mongoose");

const WorkSequenceDocumentSchema = new mongoose.Schema({
  workSequenceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "WorkSequence",
    required: true
  },
  checklists: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Checklistform"
    }
  ]
});

const WorkSequenceDocument = mongoose.model("WorkSequenceDocument", WorkSequenceDocumentSchema);

module.exports = WorkSequenceDocument;