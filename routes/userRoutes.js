const express = require("express");
const userController = require("../controllers/userController");
const authController = require("../controllers/authController");
const Router = express.Router();

Router.post("/login", authController.login);
Router.patch(
  "/updateMyPassword",
  authController.protect,
  authController.updatePassword
);
Router.route("/")
  .get(authController.protect, userController.getAllUsers)
  .post(authController.protect,authController.signup);

Router.route("/enableModules/:id").get(userController.getUserWithFilteredModules);
Router.route("/getUser/:id").get(userController.getUser);
Router.get('/AllDepartmentsRolesWorkModels', authController.protect, userController.getAllDepartmentsRolesWorkModesFromEachUser);
Router.get('/profilePicBanner/', authController.protect,userController.getUserProfileBanner);
Router.get('/downloadProfilePic/:id', userController.downloadProfilePic);
Router.get('/downloadBanner/:id', userController.downloadBanner);
Router.get('/companyAdmin/:companyId', userController.getCompanyAdminByCompanyId);
Router.delete('/profilePic/:id', userController.deleteProfilePic);
Router.delete('/banner/:id', userController.deleteBanner);
Router.put('/updateDetails/:id', userController.updateUserDetailsAndDrawing);
Router.delete(
  "/:id/removeFavouriteUser/:favouriteUserId",
  userController.removeFavouriteUser
);
//update password for both aws at 1st time
Router.post("/resetPassword",authController.resetPassword);
Router.post("/changeOldPassword",authController.protect,authController.resetOldPassword);
// for forgot aws password
Router.post("/requestForPassword",authController.requestPasswordReset);
// Router.post('/confirmForgotPassword', authController.confirmForgotPassword);
Router.post('/confirmForgotPassword', authController.verifyConfirmationCode);
 Router.put("/patch/:id", userController.patchUser);
Router.put("/upload/:id",authController.protect,  userController.uploadProfileOrBanner);
Router.put("/:id", userController.updateFavouriteUsers);

Router.post("/company/user",authController.protect,authController.createCompany);
module.exports = Router;
