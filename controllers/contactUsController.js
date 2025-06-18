const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");
const ContactUs = require("../models/contactUsModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync").catchAsync;

// Create an SES client
const sesClient = new SESClient({
  region: process.env.AWS_REGION || "ap-south-1", // Replace with your region
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    
  },
});

exports.submitContactUs = catchAsync(async (req, res, next) => {
  const {
    name,
    email,
    phoneNumber,
    companyName, // Corrected here
    role,
    inquiryType,
    message,
  } = req.body;

  // Step 1: Validate required fields before proceeding
  if (
    !name ||
    !email ||
    !phoneNumber ||
    !companyName || // Corrected here
    !role ||
    !inquiryType ||
    !message
  ) {
    return res.status(400).json({
      status: "fail",
      message:
        "All fields are required: name, email, phoneNumber, companyName, role, inquiryType, message.",
    });
  }

  // Step 2: Create a new contact entry in the database
  const contact = await ContactUs.create({
    name,
    email,
    phoneNumber,
    companyName, // Corrected here
    role,
    inquiryType,
    message,
  });

  // Step 3: Prepare email parameters
  const emailParams = {
    Source: process.env.EMAIL_USER,
    Destination: {
      ToAddresses: ["mrchams@mrchams.com"], // Recipients
    },
    Message: {
      Subject: {
        Data: `New Contact Us Submission from ${name}`,
      },
      Body: {
        Text: {
          Data: `You have received a new inquiry.\n\nDetails:\n\nName: ${name}\nEmail: ${email}\nPhone Number: ${phoneNumber}\nCompany Name: ${companyName}\nRole: ${role}\nInquiry Type: ${inquiryType}\nMessage: ${message}`,
        },
      },
    },
  };

  // Step 4: Send email using AWS SES
  const command = new SendEmailCommand(emailParams);
  await sesClient.send(command);

  // Step 5: Send success response
  res.status(201).json({
    status: "success",
    data: {
      contact,
      message: "Inquiry submitted and email notification sent.",
    },
  });
});
