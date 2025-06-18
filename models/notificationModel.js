const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const notificationSchema = new Schema({
  department:{
    type:String
  },
  status:{
    type:String
  },
  message: { 
    type: String,
     required: true
     },
  
  subject: { 
    type: String, 
    required: true
 },
  
  sentTo: { 
    type: Schema.Types.ObjectId,
     ref: 'User'
     },

  isRead: { 
    type: Boolean, 
    default: false 
      },
  createdDate: {
        type: Date,
        default: Date.now, 
      },


 });


const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
