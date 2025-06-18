const express = require("express");
const Router = express.Router();
const companyController = require("../controllers/companyController");
const authController = require("../controllers/authController");

Router.route("/")
  .get(companyController.getAllCompanies)
  .post(companyController.createCompany);
  Router.put('/logo/:id', companyController.uploadLogoMiddleware, companyController.updateLogo);

  Router.get('/logo/:id', companyController.getLogo);


  Router.put('/documents/:id', companyController.uploadDocumentsMiddleware, companyController.updateDocuments);
  Router.put('/update/:id',companyController.updateCompany);


  Router.get('/documents', companyController.getDocument);


module.exports = Router;
