const express = require("express");
const Router = express.Router();
const mailController = require("../controllers/mailController");
const authController = require("../controllers/authController");

Router.route("/")
  .get(authController.protect,mailController.getAllMail)
  .post(mailController.createMail);

  Router.route("/:id")
  .get(mailController.getMail)

Router.route("/read/:id").put(mailController.markMailAsRead);
Router.route("/:id/favorite").put(mailController.updateFavouriteMails);
Router.route("/:id/removeFavouriteMail/:favouriteUserId").put( mailController.removeFavouriteMail);
Router.route("/:id/trash").put(mailController.updateTrashMails);
Router.route('/:id/move'). put(mailController.moveMailFromTrash);
Router.route("/delete/:id").delete(mailController.deleteMail); // complete  deletion
module.exports = Router;
