const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const contactusSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  phoneNumber: {
    type: String,
    required: true,
  },
  companyName: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    required: true,
  },
  inquiryType: {
    // enum: [],
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
});

const ContactUs = mongoose.model("ContactUs", contactusSchema);

module.exports = ContactUs;
