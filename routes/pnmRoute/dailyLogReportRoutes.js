const express = require("express");
const router = express.Router();
const dailyLogReportController = require("../../controllers/pnm/dailyLogReport/vehicleAndMachineryController");
const powerToolController = require("../../controllers/pnm/dailyLogReport/powerToolsController");
const distributionBoardController = require("../../controllers/pnm/dailyLogReport/dustributionBoardController");
const batchingPointController = require("../../controllers/pnm/dailyLogReport/batchingPointController");


router.post("/vm", dailyLogReportController.createVehicleAndMachinery);
router.get("/vm", dailyLogReportController.getAllVehicleAndMachinery);
router.put("/vm/:id", dailyLogReportController.updateVehicleAndMachinery);
router.delete("/vm/:id", dailyLogReportController.deleteVehicleAndMachinery);


router.post("/pt", powerToolController.createPowerTool);
router.get("/pt", powerToolController.getAllPowerTools);
router.put("/pt/:id", powerToolController.updatePowerTool);
router.delete("/pt/:id", powerToolController.deletePowerTool);


router.post("/db", distributionBoardController.createDitributionBoard);
router.get("/db", distributionBoardController.getAllDitributionBoards);
router.put("/db/:id", distributionBoardController.updateDitributionBoard);
router.delete("/db/:id", distributionBoardController.deleteDistributionBoard);

router.post("/bp", batchingPointController.createBatchingPoint);
router.get("/bp", batchingPointController.getAllBatchingPoints);
router.put("/bp/:id", batchingPointController.updateBatchingPoint);
router.delete("/bp/:id", batchingPointController.deleteBatchingPoint);
module.exports = router;
