const express = require("express");
const Router = express.Router();
const ConstructionNeedsController = require("../../controllers/spaceController/constructionNeedsController");
const authController = require("../../controllers/authController");
Router.use( authController.protect)
Router.route("/")
  .get(ConstructionNeedsController.getAllConstructionNeeds)
  .post(
    authController.protect,
    ConstructionNeedsController.createConstructionNeeds
  );
Router.route("/fImage/:id").put(
  authController.protect,
  ConstructionNeedsController.uploadFImage,
  ConstructionNeedsController.updateFImage
);
Router.route("/fImage/:id").get(ConstructionNeedsController.getFImage);

Router.route("/contactDetails/:id").put(
  ConstructionNeedsController.updateContactDetails
);

Router.route("/file/:id/:cNo").get(ConstructionNeedsController.getFileByCNo);
Router.route("/file/:id").put(
  authController.protect,
  ConstructionNeedsController.uploadFile,
  ConstructionNeedsController.updateUploadFile
);
Router.route("/delete/:id").delete(
  ConstructionNeedsController.deleteConstructionNeeds
);
Router.route("/deleteFile/:id/:fNo").delete(
  ConstructionNeedsController.deleteFile
);
module.exports = Router;
