const express = require("express");
const Router = express.Router();
const siteController = require("../controllers/siteController");
const authController = require("../controllers/authController");



Router.put("/siteImage/:siteId",authController.protect, siteController.uploadSiteImage, siteController.updateSiteImage);
//Router.use(express.urlencoded({extended:true}))
Router.post("/PostSite", siteController.createOne);
Router.put("/update/:siteId", siteController.updateSite);

Router.put("/updateBySiteId/:siteId", siteController.updateExistingSiteById);
Router.put("/updateTower/:id", siteController.updateTowerByTowerId);
Router.put("/updateClubHouse/:id", siteController.updateClubHouseByClubHouseId);
Router.put("/updateFloor/:id", siteController.updateFloorByFloorId);
Router.put("/updateUnit/:id", siteController.updateUnitByUnitId);


Router.get("/siteImage/:siteId", siteController.getSiteImage);
Router.get("/siteDetails/:siteId", siteController.getSiteDetails);
Router.get("/AllSites", siteController.getAll);
Router.get("/getAllSitesInfo", authController.protect,siteController.getAllSitesInfo);
Router.get("/UnitDetails/:siteId", siteController.getUnitsBySiteId);
Router.get("/enableModules/:siteId",authController.protect,siteController.getEnabledModules);
Router.get("/sitesByCompanyId", authController.protect,siteController.getSitesByCompanyId);
Router.get("/getAll",siteController.getAllEnabledModules);
Router.delete('/deleteSite/:siteId',siteController.deleteDocumentsBySiteId);
module.exports = Router;
