const express = require('express');
const router = express.Router();
const ChecklistDesignController = require('../../controllers/checklistControllers/checklistDesignController');
const authController = require("../../controllers/authController");

router.post("/create", authController.protect,ChecklistDesignController.createChecklistDesign);

router.put("/update/:id", ChecklistDesignController.updateChecklistDesign);
router.get("/users",  authController.protect,ChecklistDesignController.getUsersByDepartment);
router.put("/updateApprovalStatus/:id", authController.protect, ChecklistDesignController.updateApprovalStatus);
router.put("/updateRevision/:id",ChecklistDesignController.updateRevision);
router.put("/updateDescription/:id/dNo/:dNo",ChecklistDesignController.updateDescriptionByDNo);
router.delete('/description/:id/dNo/:dNo', ChecklistDesignController.deleteDescriptionByDNo);
router.delete('/checklist/:checklistId/assigningIncharge/:inchargeId', ChecklistDesignController.deleteAssignInchargeById);
router.delete('/checklistDesigns/:id', ChecklistDesignController.deleteChecklistDesignById);
router.get("/getAllUsingCompanyId", authController.protect,ChecklistDesignController.getChecklistDesignsByCompanyId);
router.get("/getApprovedChecklists", authController.protect,ChecklistDesignController.getApprovedChecklists);
router.get("/pnmDepartmentChecklistDesigns", authController.protect,ChecklistDesignController.getPnmDepartmentChecklistDesigns);


router.get("/checklistById/:id", ChecklistDesignController.getChecklistDesignById);
router.put('/updateSharedTo/:checklistId', ChecklistDesignController.updateSharedTo);
module.exports = router;
