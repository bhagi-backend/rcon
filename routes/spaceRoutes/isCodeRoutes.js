const express = require("express");
const Router = express.Router();
const isCodeController = require("../../controllers/spaceController/isCodeController");
const authController = require("../../controllers/authController");

Router.route("/")
  .get(isCodeController.getAllIsCodes)
  .post( authController.protect,isCodeController.createIsCode);
  Router.route("/fImage/:id").put(authController.protect,isCodeController.uploadFImage, isCodeController.updateFImage);
  Router.route('/fImage/:id').get(isCodeController.getFImage);
  Router.route("/updateFiles/:id/:fNo").put( authController.protect,isCodeController.updateFileName);
  Router.route("/fileName/:id").put( authController.protect,isCodeController.updateFileName);
  Router.route('/file/:id/:fNo').get(isCodeController.getFileByFNo);
  Router.route("/file/:id").put(authController.protect,isCodeController.uploadFile, isCodeController.updateUploadFile);
  Router.route("/update/:id").put( isCodeController.updateIsCodeById);
  Router.route("/delete/:id").delete( isCodeController.deleteIsCode);
  Router.route("/deleteFile/:id/:fNo").delete( isCodeController.deleteFile);
  
module.exports = Router;
