const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");
const Mail = require('../models/mailModel');
const express = require("express");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync").catchAsync;
const User = require('../models/userModel');
require('dotenv').config(); 

const sesClient = new SESClient({
  region: process.env.AWS_REGION || "ap-south-1", // 
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

exports.createMail = catchAsync(async (req, res) => {
  const mailData = {
    ...req.body,
    originalStatus: 'sent' 
  };

  const mail = await Mail.create(mailData);
  const recipient = await User.findById(mail.sentTo).select('email');

  if (!recipient) {
    return res.status(404).json({
      status: 'fail',
      message: 'Recipient not found'
    });
  }

  // Step 1: Prepare email parameters
  const mailOptions = {
    Source: process.env.EMAIL_USER, // Sender's email address
    Destination: {
      ToAddresses: [recipient.email]
    },
    Message: {
      Subject: {
        Data: mail.subject
      },
      Body: {
        Text: {
          Data: mail.message
        }
      }
    }
  };

try {
  const command = new SendEmailCommand(mailOptions);
  await sesClient.send(command);
  res.status(201).json({
    status: 'success',
    mail: mail,
    message: "Notification has been sent."
  });
} catch (error) {
  res.status(400).json({
    status: 'error',
    message: 'Failed to send email',
    error: error.message
  });
}
});

exports.getAllMail = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { type } = req.query;

  if (type === 'sent') {
    const sentMail = await Mail.find({ sentBy: userId })
      .populate('sentBy')
      .populate('sentTo')
      .populate('userID');  // Populate userID

    res.status(200).json({
      status: 'success',
      data: {
        sentMail
      }
    });
  } else if (type === 'received') {
    const receivedMail = await Mail.find({ sentTo: userId })
      .populate('sentBy')
      .populate('sentTo')
      .populate('userID'); 

    res.status(200).json({
      status: 'success',
      data: {
        receivedMail
      }
    });
  } else {
    return next(new AppError('Invalid type parameter. Use "sent" or "received".', 400));
  }
});

exports.getMail = catchAsync(async (req, res, next) => {
  const mail = await Mail.findById(req.params.id);
  if (!mail) {
    return next(new AppError("No mail found with that id", 404));
  }
  res.status(200).json({
    status: "success",
    data: mail,
  });
});



exports.markMailAsRead = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  if (!id) {
    return next(new AppError('Mail ID is missing', 400));
  }

  const mail = await Mail.findById(id);

  if (!mail) {
    return next(new AppError('No mail found with that ID', 404));
  }

  mail.isRead = true;
  await mail.save();

  res.status(200).json({
    status: 'success',
    data: {
      mail
    }
  });
});

exports.updateFavouriteMails = catchAsync(async (req, res, next) => {
  const mailId = req.params.id; // mail ID from the route
  const userId = req.body.userId; // user ID to favorite the mail

  if (!userId) {
    return res.status(400).send({
      status: "fail",
      message: "No user ID provided",
    });
  }

  const mail = await Mail.findById(mailId);
  if (!mail) {
    return res.status(404).send({
      status: "fail",
      message: "No mail found with that ID",
    });
  }
  
  // Mark the mail as favorite
  mail.issentfavourite = true;
  await mail.save();

  res.status(200).send({
    status: "success",
    message: "Mail marked as favorite successfully",
  });
});

exports.removeFavouriteMail = catchAsync(async (req, res, next) => {
  const mailId = req.params.id; // mail ID from the route
  const userId = req.body.userId; // user ID to remove favorite

  if (!userId) {
    return res.status(400).send({
      status: "fail",
      message: "No user ID provided",
    });
  }

  const mail = await Mail.findById(mailId);
  if (!mail) {
    return res.status(404).send({
      status: "fail",
      message: "No mail found with that ID",
    });
  }

  // Check if the mail is not marked as favorite
  if (!mail.issentfavourite || mail.sentBy.toString() !== userId) {
    return res.status(404).send({
      status: "fail",
      message: "Mail is not marked as a favorite",
    });
  }

  // Remove the favorite mark
  mail.issentfavourite = false;
  await mail.save();

  res.status(200).send({
    status: "success",
    message: "Mail removed from favorites successfully",
  });
});

exports.updateTrashMails = catchAsync(async (req, res, next) => {
  const mailId = req.params.id;

  const mail = await Mail.findById(mailId);
  if (!mail) {
    return res.status(404).send({
      status: 'fail',
      message: 'No mail found with that ID',
    });
  }

  // Update the trash status
  mail.trash = true;
  await mail.save();

  res.status(200).send({
    status: 'success',
    message: 'Mail marked as trash successfully',
    data: mail,
  });
});

exports.moveMailFromTrash = catchAsync(async (req, res, next) => {
  const mailId = req.params.id;

  const mail = await Mail.findById(mailId);
  if (!mail) {
    return res.status(404).send({
      status: 'fail',
      message: 'No mail found with that ID',
    });
  }

  // Check if the mail is in trash
  if (!mail.trash) {
    return res.status(400).send({
      status: 'fail',
      message: 'Mail is not in trash',
    });
  }

  // Restore the mail
  mail.trash = false;

  await mail.save();

  res.status(200).send({
    status: 'success',
    message: 'Mail moved from trash successfully',
    data: mail,
  });
});

// Complete deletion
exports.deleteMail = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  // Find and delete the notification by its ID
  const mail = await Mail.findByIdAndDelete(id);

  if (!mail) {
    return next(new AppError('No mail found with that ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null,
  });
});
