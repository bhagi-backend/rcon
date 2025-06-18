const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const MailSchema = new Schema({
  originalStatus: {
    type: String,
    enum: ["sent", "received", "trash","draft"],
  },
  sentTo: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  subject: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  Cc: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  Bcc: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  userID: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },

  sentBy: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  trash: {
    type: Boolean,
    default: false,
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  receivedStatus: {
    type: Boolean,
    default: false,
  },
  sentdtstatus: {
    enum: ["draft", "sent"],
  },
  isreceivedfavourite: {
    type: Boolean,
    default: false,
  },
  issentfavourite: {
    type: Boolean,
    default: false,
  },
  publishedDate: {
    type: Date,
    default: Date.now,
  },
});

const Mail = mongoose.model("Mail", MailSchema);

module.exports = Mail;
