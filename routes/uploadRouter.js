const multer = require("multer");
const express = require("express");
const router = express.Router();
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    return cb(null, "./uploads");
  },
  filename: function(req, file, cb) {
    return cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage: storage });
router.post(
  "/",
  upload.fields([
    { name: "cv" },
    { name: "pan" },
    { name: "bank" },
    { name: "aadhar" },
    { name: "edu" },
    { name: "exp" },
  ]),
  (req, res) => {
    console.log(req.body);
    console.log(req.file);
    return res.redirect("/api/upload");
  }
);
router.get("/", (req, res) => {
  return res.status(200).send({
    status: "success",
  });
});
module.exports = router;
