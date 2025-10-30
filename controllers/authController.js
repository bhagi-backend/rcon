const { CognitoIdentityProviderClient, AdminDeleteUserCommand, AdminInitiateAuthCommand,AdminCreateUserCommand, AdminSetUserPasswordCommand, CreateGroupCommand,AdminAddUserToGroupCommand, InitiateAuthCommand, ForgotPasswordCommand, ListUsersCommand ,DeleteGroupCommand,ConfirmForgotPasswordCommand,} = require("@aws-sdk/client-cognito-identity-provider");
const jwt = require("jsonwebtoken");
const { promisify } = require("util");
const User = require("../models/userModel");
const Site = require("../models/sitesModel");
const Company = require("../models/companyModel"); 
const AppError = require("../utils/appError");
const { catchAsync } = require("../utils/catchAsync");
const bcrypt = require("bcryptjs");
const sendNotification = require("../utils/utilFun");
require('dotenv').config();  
const cognitoClient = new CognitoIdentityProviderClient({ region: 'ap-south-1' });

const generateDefaultPassword = (firstName) => {
  const capitalizedFirstName = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
  
  return `${capitalizedFirstName}@1234`;
};
const deleteCognitoUser = async (username) => {
  const params = {
    UserPoolId: process.env.COGNITO_USER_POOL_ID,
    Username: username,
  };

  try {
    await cognitoClient.send(new AdminDeleteUserCommand(params));
    console.log(`User with username ${username} deleted from Cognito`);
  } catch (error) {
    console.error(`Error deleting user from Cognito: ${error.message}`);
  }
};

const createCognitoUser = async (email, password, department, phoneNumber, firstName, bloodGroup, emergencyContact) => {
  const username = `user_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const params = {
    UserPoolId: process.env.COGNITO_USER_POOL_ID,
    Username: username,
    DesiredDeliveryMediums: ['EMAIL'],
    UserAttributes: [
      { Name: 'email', Value: email },
      { Name: 'name', Value: firstName },
      { Name: 'email_verified', Value: 'true' }
    ],
  };

  try {
    const result = await cognitoClient.send(new AdminCreateUserCommand(params));
    const username = result.User.Username;
console.log("userName:",username)
    // Set the password after user creation
    const passwordParams = {
      UserPoolId: process.env.COGNITO_USER_POOL_ID,
      Username: username, 
      Password: password,
      Permanent: true,
    };
    await cognitoClient.send(new AdminSetUserPasswordCommand(passwordParams));
    return { username, result };
  } catch (error) {
    console.error('Detailed error:', error);
    throw new Error('Error creating user in Cognito: ' + error.message);
  }
};

const addUserToGroup = async (username, groupName) => {
  // Sanitize group name (replace spaces with underscores)
  const sanitizedGroupName = groupName.replace(/\s+/g, '_');

  const params = {
    GroupName: sanitizedGroupName,
    UserPoolId: process.env.COGNITO_USER_POOL_ID,
    Username: username,
  };

  try {
    await cognitoClient.send(new AdminAddUserToGroupCommand(params));
  } catch (error) {
    // If group not found, create it and retry
    if (error.name === "ResourceNotFoundException") {
      try {
        const createGroupParams = {
          UserPoolId: process.env.COGNITO_USER_POOL_ID,
          GroupName: sanitizedGroupName,
          Description: `${groupName} group`,
        };
        await cognitoClient.send(new CreateGroupCommand(createGroupParams));

        // Retry adding user to the newly created group
        await cognitoClient.send(new AdminAddUserToGroupCommand(params));
      } catch (createError) {
        console.error('Error creating group or re-adding user:', createError);
        throw new Error('Error creating or adding user to group in Cognito: ' + createError.message);
      }
    } else {
      console.error('Detailed error:', error);
      throw new Error('Error adding user to group in Cognito: ' + error.message);
    }
  }
};


exports.signup = catchAsync(async (req, res, next) => {
  const { role, permittedSites, department, email, phoneNumber, firstName, bloodGroup, emergencyContact } = req.body;
  let username;  
  if (department === 'Design Consultant' && Array.isArray(permittedSites)) {
    try {
      const siteIds = permittedSites.map(site => site.siteId);
      const sites = await Site.find({ '_id': { $in: siteIds } }).select('siteName');
      const siteNamesMap = new Map(sites.map(site => [site._id.toString(), site.siteName]));

      for (let site of permittedSites) {
        const existingUser = await User.findOne({
          'permittedSites.siteId': site.siteId,
          role: role,
        });

        if (existingUser) {
          const siteName = siteNamesMap.get(site.siteId.toString());
          return res.status(200).json({
            status: "warning",
            msg: `Role: ${role} with the permitted site: ${siteName} is already assigned to another user`,
          });
        }
      }
    } catch (err) {
      console.error('Error checking site permissions:', err.message);
      return next(new AppError('Error checking site permissions', 400));
    }
  }

  try {
    // Check if the user already exists in MongoDB
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(200).json({
        status: "warning",
        msg: "A user with this email already exists.",
      });
    }
const existingEmpId = await User.findOne({ empId: req.body.empId });
if (existingEmpId) {
  return res.status(200).json({
    status: "warning",
    msg: `A user with this empId (${req.body.empId}) already exists.`,
  });
}
    const password = generateDefaultPassword(firstName);

    try {
      // Step 1: Create user in AWS Cognito
      const cognitoResponse = await createCognitoUser(email, password, department, phoneNumber, firstName, bloodGroup, emergencyContact);
      username = cognitoResponse.username;  // Store Cognito username for potential rollback

      console.log("Cognito username:", username);

      const currentUserId = req.user.id;
      const currentUser = await User.findById(currentUserId).exec();

      if (!currentUser) {
        // Rollback Cognito user if MongoDB user not found
        await deleteCognitoUser(username);
        return res.status(404).json({
          status: 'fail',
          message: 'Creating user not found in MongoDB.',
        });
      }

      // Step 3: Ensure the user's company exists
      // const company = await Company.findById(currentUser.companyId).exec();
      const company = await Company.findById(req.body.companyId).exec();
      if (!company) {
        await deleteCognitoUser(username);
        return res.status(404).json({
          status: 'fail',
          message: 'Company not found.',
        });
      }

      // Step 4: Add user to Cognito group based on company name
      const groupName = company.companyDetails.companyName;
      await addUserToGroup(username, groupName);

      // Step 5: Save the new user to MongoDB
      const newUser = new User({
        ...req.body,
       // password: password,
        companyId: currentUser.companyId,
        createdBy: currentUserId,
      });

      await newUser.save();

      // Step 6: Send notification about the new user creation
      const notificationMessage = `A new user, ${firstName}, has been created with the role: ${role} in the department: ${department}.`;
      const notification = await sendNotification('User', notificationMessage, 'New User Created', 'Signup', currentUserId);

      return res.status(201).json({
        status: "success",
        notification,
        msg: "User created successfully in Cognito and added to group. User details saved in MongoDB.",
      });

    } catch (cognitoError) {
      // Handle AWS Cognito errors and rollback if necessary
      console.error('Error creating user in Cognito:', cognitoError.message);

      if (username) {
        try {
       
          await deleteCognitoUser(username);
          console.log('Cognito user deleted due to error.');
        } catch (deleteError) {
          console.error('Failed to delete Cognito user during rollback:', deleteError.message);
        }
      }

      if (cognitoError.code === 'UsernameExistsException') {
        return res.status(400).json({
          status: 'warning',
          msg: 'A user with this email already exists in AWS Cognito and user has been deleted.',
        });
      } else if (cognitoError.code === 'InvalidParameterException') {
        return res.status(400).json({
          status: 'error',
          msg: 'One or more parameters are invalid. Please check your input.',
        });
      } else if (cognitoError.code === 'LimitExceededException') {
        return res.status(429).json({
          status: 'error',
          msg: 'Request limit exceeded. Please try again later.',
        });
      } else {
       

        return res.status(400).json({
          status: 'error',
          msg: 'There was an issue creating the user in Cognito. Please check if your email already exists.',
        });
      }
    }

  } catch (dbError) {
    // Rollback Cognito user if any MongoDB error occurs
    console.error('Error during signup in MongoDB:', dbError.message);
    if (username) {
      try {
        await deleteCognitoUser(username);  // Delete Cognito user if MongoDB fails
        console.log('Cognito user deleted due to MongoDB error.');
      } catch (deleteError) {
        console.error('Failed to delete Cognito user during rollback:', deleteError.message);
      }
    }

    if (dbError.code === 11000) {
      return res.status(400).json({
        status: 'warning',
        msg: `Duplicate key error in MongoDB: ${Object.keys(dbError.keyValue)} already exists.`,
      });
    }

    return res.status(400).json({
      status: 'error',
      msg: 'An error occurred while saving the user in MongoDB. Cognito user creation has been rolled back.',
    });
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  const { email, temporaryPassword, newPassword, confirmNewPassword } = req.body;

  if (!email  || !newPassword || !confirmNewPassword) {
    return res.status(400).json({ error: "Email, temporary password, new password, and confirmation password are required." });
  }

  if (newPassword !== confirmNewPassword) {
    return res.status(400).json({ error: "New password and confirmation password do not match." });
  }

  try {
    const params = {
      UserPoolId: process.env.COGNITO_USER_POOL_ID,
      Username: email,
      Password: newPassword,
      Permanent: true
    };

    await cognitoClient.send(new AdminSetUserPasswordCommand(params));

    const updatedUser = await User.findOneAndUpdate(
      { email: email },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const notificationMessage = `The password for user ${email} has been reset successfully.`;
    const notification = await sendNotification('User', notificationMessage, 'Password Reset', 'Reset', updatedUser._id);

    res.status(200).json({ message: 'Password updated successfully', notification });
  } catch (error) {
    console.error('Error resetting password:', error.message);
    res.status(400).json({ error: 'Error resetting password' });
  }
});

// Function to sign the custom JWT
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_S, {
    expiresIn: process.env.JWT_E,
  });
};

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  const params = {
    AuthFlow: 'USER_PASSWORD_AUTH',
    ClientId: process.env.COGNITO_CLIENT_ID,
    AuthParameters: {
      USERNAME: email,
      PASSWORD: password,
    },
  };
 let user = await User.findOne({ email })
  .populate({
    path: "companyId",
    select: "companyDetails.companyName companyEnableModules",
  })
  .populate({
    path: "permittedSites.siteId",
    select: "siteName",
  });
  if (!user) {
  return res.status(404).json({
    status: "failed",
    message: "You do not have account"
  });
}
 if (user.loginUser === "Support") {
    return res.status(403).json({
    status: "failed",
    message: "Support users cannot log in here. Please use the Support portal."
  });
    }
  try {
    const data = await cognitoClient.send(new InitiateAuthCommand(params));
    const { AccessToken, IdToken, RefreshToken } = data.AuthenticationResult;

  
    if (user.department === 'Company Admin') {
      user = await User.findOne({ email })
        .populate({
          path: 'companyId',
          select: " companyDetails.companyName companyEnableModules "
        })
        .exec();
    }
  // Convert to plain object to manipulate structure
    let userObj = user.toObject();

    // Flatten permittedSites
    if (Array.isArray(userObj.permittedSites)) {
      userObj.permittedSites = userObj.permittedSites.map(site => {
        const populated = site.siteId || {};
        return {
          _id: site._id,
          siteId: populated._id || site.siteId,
          siteName: populated.siteName || null,
          enableModules: site.enableModules,
        };
      });
    }

    const token = signToken(user._id);
    const notificationMessage = `A user with email ${email} has logged in`;
    await sendNotification(
      "User",
      notificationMessage,
      'User login successfully',
      'login',
      user._id
    );

    res.status(200).json({
      status: 'success',
      token,
      cognitoTokens: {
        idToken: IdToken,
        accessToken: AccessToken,
        refreshToken: RefreshToken,
      },
      user:userObj
    });
  } catch (err) {
    console.error('Error logging in:', err.message);
    return next(new AppError('Error logging in: ' + err.message, 400));
  }
});


exports.supportLogin = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  const params = {
    AuthFlow: 'USER_PASSWORD_AUTH',
    ClientId: process.env.COGNITO_CLIENT_ID,
    AuthParameters: {
      USERNAME: email,
      PASSWORD: password,
    },
  };
   let user = await User.findOne({ email })
  .populate({
    path: "companyId",
    select: "companyDetails.companyName companyEnableModules",
  })
  .populate({
    path: "permittedSites.siteId",
    select: "siteName",
  });
    if (!user) {
  return res.status(404).json({
    status: "failed",
    message: "You do not have account"
  });
}
 if (user.loginUser === "User") {
  return res.status(403).json({
    status: "failed",
    message: "Normal users cannot log in here. Please use the user portal."
  });}
  try {
    const data = await cognitoClient.send(new InitiateAuthCommand(params));
    const { AccessToken, IdToken, RefreshToken } = data.AuthenticationResult;


    
    
    if (user.department === 'Company Admin') {
      user = await User.findOne({ email })
        .populate({
          path: 'companyId',
          select: " companyDetails.companyName companyEnableModules "
        })
        .exec();
    }
  // Convert to plain object to manipulate structure
    let userObj = user.toObject();

    // Flatten permittedSites
    if (Array.isArray(userObj.permittedSites)) {
      userObj.permittedSites = userObj.permittedSites.map(site => {
        const populated = site.siteId || {};
        return {
          _id: site._id,
          siteId: populated._id || site.siteId,
          siteName: populated.siteName || null,
          enableModules: site.enableModules,
        };
      });
    }
const companies = await Company.find()
    .sort({ createdAt: -1 })
    .populate("sites");

  // For each company, also fetch its Admin user
  const filteredCompanies = await Promise.all(
    companies.map(async (company) => {
      const companyObj = company.toObject();

      // filter enabled modules
      const companyEnableModules = companyObj.companyEnableModules || {};
      const filteredModules = {};
      for (const [key, value] of Object.entries(companyEnableModules)) {
        if (value === true) {
          filteredModules[key] = value;
        }
      }

      // fetch admin user for this company
      const adminUser = await User.findOne({
        companyId: company._id,
        role: "Admin",
        department: "Company Admin",
      }).select("firstName lastName email contactNumber empId role department");

      return {
        ...companyObj,
        companyEnableModules: filteredModules,
        adminUser: adminUser || null, // attach admin user if exists
      };
    })
  );

     const token = signToken(user._id);
    const notificationMessage = `A user with email ${email} has logged in`;
    await sendNotification(
      "User",
      notificationMessage,
      'User login successfully',
      'login',
      user._id
    );

    res.status(200).json({
      status: 'success',
      token,
      cognitoTokens: {
        idToken: IdToken,
        accessToken: AccessToken,
        refreshToken: RefreshToken,
      },
      user:userObj,
      companiesLength: filteredCompanies.length,
      companies:filteredCompanies
    });
  } catch (err) {
    console.error('Error logging in:', err.message);
    return next(new AppError('Error logging in: ' + err.message, 400));
  }
});
exports.protect = catchAsync(async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }
  console.log(token);
  if (!token) {
    return next(new AppError("you are not logged in! please login", 401));
  }
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_S);
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new Error("The user belonging to this token no longer exist", 401)
    );
  }
  req.user = currentUser;
  next();
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id).select("+password");
  if (!user) {
    return next(new AppError("There is no user with this email!!", 404));
  }
  const givenPassword = await bcrypt.compare(
    req.body.currentPassword,
    user.password
  );
  if (!givenPassword) {
    return next(new AppError("your current password is wrong", 401));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.confirmPassword;
  await user.save();
  const token = signToken(user._id);
  res.status(200).send({
    status: "success",
    token,
  });
});
const requestPasswordReset = async (email) => {
  const params = {
    ClientId: process.env.COGNITO_CLIENT_ID,
    Username: email,
  };

  try {
     return await cognitoClient.send(new ForgotPasswordCommand(params));
  } catch (error) {
    console.error("Error requesting password reset:", error.message);
    throw new Error("Error requesting password reset");
  }
};

exports.requestPasswordReset = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email is required." });
  }

  try {
    await requestPasswordReset(email);
    res.status(200).json({ message: "Password reset code sent to email." });
  } catch (error) {
    console.error('Error requesting password reset:', error.message);
    next(new AppError('Error requesting password reset', 400));
  }
});


// Function to confirm the password reset
// const confirmPasswordReset = async (username, confirmationCode, newPassword) => {
//   const params = {
//     ClientId: process.env.COGNITO_CLIENT_ID, // Your Cognito App Client ID
//     ConfirmationCode: confirmationCode,
//     Username: username,
//     Password: newPassword,
//   };

//   // Create the command to confirm the password reset
//   const command = new ForgotPasswordCommand(params);

//   try {
//     // Send the command to Cognito
//     await cognitoClient.send(command);
//     return { status: 'success', message: 'Password reset confirmed successfully.' };
//   } catch (error) {
//     console.error('Error confirming password reset:', error.message);

//     // Customize error responses based on AWS error codes
//     if (error.name === 'ExpiredCodeException') {
//       throw new Error('The confirmation code has expired. Please request a new password reset.');
//     } else if (error.name === 'CodeMismatchException') {
//       throw new Error('The confirmation code is incorrect. Please try again.');
//     } else if (error.name === 'UserNotFoundException') {
//       throw new Error('User not found. Please ensure the username is correct.');
//     } else {
//       throw new Error('An error occurred while confirming the password reset. Please try again.');
//     }
//   }
// };

const getCognitoUsernameByEmail = async (email) => {
  const params = {
    UserPoolId: process.env.COGNITO_USER_POOL_ID,
    Filter: `email = "${email}"`,
    Limit: 1
  };

  // Create the command to list users
  const command = new ListUsersCommand(params);

  try {
    // Send the command to Cognito
    const data = await cognitoClient.send(command);

    if (data.Users.length === 0) {
      throw new Error('User not found');
    }

    return data.Users[0].Username; // Return the Cognito username
  } catch (error) {
    console.error('Error fetching user by email:', error.message);
    
    // Handle specific errors if necessary
    throw new Error('An error occurred while fetching the user by email. Please try again.');
  }
};

// exports.confirmForgotPassword = catchAsync(async (req, res, next) => {
//   const { email, confirmationCode, newPassword } = req.body;

//   if (!confirmationCode || !newPassword) {
//     return next(new AppError('Please provide confirmation code and new password', 400));
//   }

//   try {
//     const username = await getCognitoUsernameByEmail(email);
//     await confirmPasswordReset(username, confirmationCode, newPassword);

//     const updatedUser = await User.findOneAndUpdate(
//       { email: email },
//       { new: true }
//     );

//     if (!updatedUser) {
//       return res.status(404).json({ error: 'User not found' });
//     }

//     res.status(200).json({
//       status: 'success',
//       message: 'Password reset successfully'
//     });
//   } catch (err) {
//     console.error('Error confirming forgot password:', err.message);
//     next(new AppError('Error confirming forgot password: ' + err.message, 400));
//   }
// });
// exports.verifyConfirmationCode = catchAsync(async (req, res, next) => {
//   const { email, confirmationCode } = req.body;

//   if (!confirmationCode || !email) {
//     return next(new AppError('Please provide email and confirmation code', 400));
//   }

//   try {
//     const username = await getCognitoUsernameByEmail(email);
//     console.log("username:", username);
    
//     // Verify the confirmation code by calling confirmForgotPassword
//     await confirmPasswordReset(username, confirmationCode, 'TempPassword123!'); // Temporary password for validation
    
//     res.status(200).json({
//       status: 'success',
//       message: 'Confirmation code verified, proceed to reset password.'
//     });
//   } catch (err) {
//     console.error('Error verifying confirmation code:', err.message);
//     next(new AppError('Error verifying confirmation code: ' + err.message, 400));
//   }
// });
// Function to confirm the password reset
const confirmPasswordReset = async (
  username,
  confirmationCode,
  newPassword
) => {
  const params = {
    ClientId: process.env.COGNITO_CLIENT_ID,
    ConfirmationCode: confirmationCode,
    Username: username,
    Password: newPassword,
  };

  const command = new ConfirmForgotPasswordCommand(params);

  try {
    await cognitoClient.send(command);
    return {
      status: "success",
      message: "Password reset confirmed successfully.",
    };
  } catch (error) {
    console.error("Error confirming password reset:", error.message);

    if (error.name === "ExpiredCodeException") {
      throw new Error(
        "The confirmation code has expired. Please request a new password reset."
      );
    } else if (error.name === "CodeMismatchException") {
      throw new Error("The confirmation code is incorrect. Please try again.");
    } else if (error.name === "UserNotFoundException") {
      throw new Error("User not found. Please ensure the username is correct.");
    } else {
      throw new Error(
        "An error occurred while confirming the password reset. Please try again."
      );
    }
  }
};

// const getCognitoUsernameByEmail = async (email) => {
//   const params = {
//     UserPoolId: process.env.COGNITO_USER_POOL_ID,
//     Filter: `email = "${email}"`,
//     Limit: 1,
//   };
//   const command = new ListUsersCommand(params);

//   try {
//     const data = await cognito.send(command);

//     if (data.Users.length === 0) {
//       throw new Error("User not found");
//     }

//     return data.Users[0].Username;
//   } catch (error) {
//     console.error("Error fetching user by email:", error.message);

//     throw new Error(
//       "An error occurred while fetching the user by email. Please try again."
//     );
//   }
// };

exports.verifyConfirmationCode = catchAsync(async (req, res, next) => {
  const { email, confirmationCode } = req.body;

  if (!confirmationCode || !email) {
    return next(
      new AppError("Please provide email and confirmation code", 400)
    );
  }

  try {
    const username = await getCognitoUsernameByEmail(email);
    console.log("username:", username);

    await confirmPasswordReset(username, confirmationCode, "TempPassword123!");

    res.status(200).json({
      status: "success",
      message: "Confirmation code verified, proceed to reset password.",
    });
  } catch (err) {
    //console.error('Error verifying confirmation code:', err.message);

    //if (err.message.includes('Invalid verification code')) {
    return res.status(200).json({
      status: "fail",
      message: "Invalid confirmation code. Please try again.",
    });
    //}

    // return res.status(400).json({
    //   status: 'fail',
    //   message: 'Error verifying confirmation code: ' + err.message,
    // });
  }
});

const formatGroupName = (companyName) => {
 
  const formattedGroupName = companyName.replace(/\s+/g, '');
  return formattedGroupName;
};

// exports.createCompany = catchAsync(async (req, res, next) => {
//   let companyId, username;
//   const newCompany = new Company(req.body);
//     await newCompany.save();
//     companyId = newCompany._id;
//   const { companyName } = newCompany.companyDetails;
//   const formattedGroupName = formatGroupName(companyName);
//   try {
    
//     const createGroupParams = {
//       GroupName: formattedGroupName,
//       UserPoolId: process.env.COGNITO_USER_POOL_ID,
//       Description: `Group for ${formattedGroupName}`,
//     };

//     await cognitoClient.send(new CreateGroupCommand(createGroupParams));

//     const { email, firstName } = req.body.userDetails;
//     const password = generateDefaultPassword(firstName);
//     const username1 = `user_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
//     // Create user in Cognito
//     const createUserParams = {
//       UserPoolId: process.env.COGNITO_USER_POOL_ID,
//        Username: username1,
//       UserAttributes: [
//         { Name: 'email', Value: email },
//         { Name: 'given_name', Value: firstName },
//         { Name: 'email_verified', Value: 'true' }
//       ],
//       TemporaryPassword: password,
//      // MessageAction: 'SUPPRESS', // Suppress the sending of the welcome email
//     };

//     const cognitoResponse = await cognitoClient.send(new AdminCreateUserCommand(createUserParams));
//     username = cognitoResponse.User.Username;

//     // Add user to the Cognito group
//     await addUserToGroup(username, formattedGroupName);

//     // Create the user in MongoDB
//     const newUser = new User({
//       ...req.body.userDetails,
//       companyId,
//       createdBy: req.user.id,
//     });
//     await newUser.save();

//     res.status(201).json({
//       status: 'success',
//       data: {
//         company: newCompany,
//         user: newUser,
//       },
//       msg: 'Company and user created successfully, and user added to the Cognito group.',
//     });
//   } catch (error) {
//     console.error('Error during company creation:', error.message);

//     // Rollback logic
//     if (username) {
//       await deleteCognitoUser(username).catch(deleteError =>
//         console.error('Failed to delete Cognito user during rollback:', deleteError.message)
//       );
//     }
//     if (formattedGroupName) {
//       const deleteGroupParams = {
//         GroupName: formattedGroupName,
//         UserPoolId: process.env.COGNITO_USER_POOL_ID,
//       };
//       await cognitoClient
//         .send(new DeleteGroupCommand(deleteGroupParams))
//         .catch(groupDeleteError =>
//           console.error('Failed to delete Cognito group during rollback:', groupDeleteError.message)
//         );
//     }
//     if (companyId) {
//       await Company.findByIdAndDelete(companyId).catch(companyDeleteError =>
//         console.error('Failed to delete company during rollback:', companyDeleteError.message)
//       );
//     }

//     next(new AppError('Error creating company and user: ' + error.message, 400));
//   }
// });
exports.createCompany = catchAsync(async (req, res, next) => {
  let companyId, username;
  const newCompany = new Company(req.body);
  await newCompany.save();
  companyId = newCompany._id;
  const { companyName } = newCompany.companyDetails;
  const formattedGroupName = formatGroupName(companyName);

  try {
    const createGroupParams = {
      GroupName: formattedGroupName,
      UserPoolId: process.env.COGNITO_USER_POOL_ID,
      Description: `Group for ${formattedGroupName}`,
    };

    await cognitoClient.send(new CreateGroupCommand(createGroupParams));

    const { email, firstName } = req.body.userDetails;
    const password = generateDefaultPassword(firstName);
    const username1 = `user_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    // Create user in Cognito
    const createUserParams = {
      UserPoolId: process.env.COGNITO_USER_POOL_ID,
      Username: username1,
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'given_name', Value: firstName },
        { Name: 'email_verified', Value: 'true' },
      ],
      TemporaryPassword: password,
      // MessageAction: 'SUPPRESS', // Suppress the sending of the welcome email
    };

    const cognitoResponse = await cognitoClient.send(
      new AdminCreateUserCommand(createUserParams)
    );
    username = cognitoResponse.User.Username;

    // Add user to the Cognito group
    await addUserToGroup(username, formattedGroupName);

    // Create the user in MongoDB
    const newUser = new User({
      ...req.body.userDetails,
      companyId,
      createdBy: req.user.id,
    });
    await newUser.save();

    res.status(201).json({
      status: 'success',
      data: {
        company: newCompany,
        user: newUser,
      },
      msg: 'Company and user created successfully, and user added to the Cognito group.',
    });
  } catch (error) {
    console.error('Error during company creation:', error.message);

    // Rollback logic
    if (username) {
      await deleteCognitoUser(username).catch(deleteError =>
        console.error('Failed to delete Cognito user during rollback:', deleteError.message)
      );
    }
    if (formattedGroupName) {
      const deleteGroupParams = {
        GroupName: formattedGroupName,
        UserPoolId: process.env.COGNITO_USER_POOL_ID,
      };
      await cognitoClient
        .send(new DeleteGroupCommand(deleteGroupParams))
        .catch(groupDeleteError =>
          console.error('Failed to delete Cognito group during rollback:', groupDeleteError.message)
        );
    }
    if (companyId) {
      await Company.findByIdAndDelete(companyId).catch(companyDeleteError =>
        console.error('Failed to delete company during rollback:', companyDeleteError.message)
      );
    }

    // Return JSON error response instead of using next(AppError)
    return res.status(400).json({
      status: 'error',
      message: 'Error creating company and user',
      error: error.message,
    });
  }
});

exports.resetOldPassword = catchAsync(async (req, res, next) => {
  const { oldPassword, newPassword, reEnterNewPassword } = req.body;
  const email = req.user?.email;

  if (!email || !oldPassword || !newPassword || !reEnterNewPassword) {
    return res.status(400).json({ error: "Email, old password, new password, and re-entered new password are required." });
  }

  if (newPassword !== reEnterNewPassword) {
    return res.status(400).json({ error: "New password and re-entered new password do not match." });
  }

  try {
    // Step 1: Authenticate the user with their old password
    await cognitoClient.send(new AdminInitiateAuthCommand({
      AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
      UserPoolId: process.env.COGNITO_USER_POOL_ID,
      ClientId: process.env.COGNITO_CLIENT_ID,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: oldPassword,
      },
    }));

    // Step 2: Update the user's password
    await cognitoClient.send(new AdminSetUserPasswordCommand({
      UserPoolId: process.env.COGNITO_USER_POOL_ID,
      Username: email,
      Password: newPassword,
      Permanent: true,
    }));

    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error resetting password:', error.message);
    if (error.name === 'NotAuthorizedException') {
      return res.status(400).json({ error: 'Old password is incorrect.' });
    }
    next(new AppError('Error resetting password: ' + error.message, 400));
  }
});