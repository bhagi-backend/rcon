const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ConnectedDevicesSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  ipAddress: {
    type: String,
    required: true,
  },
  loginUserId: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
  },
});

const  ConnectedDevices = mongoose.model(" ConnectedDevices", ConnectedDevicesSchema);

module.exports =  ConnectedDevices;
