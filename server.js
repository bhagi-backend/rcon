const app = require("./app");

const mongoose = require("mongoose");
const { scheduleTaskStatusUpdate,scheduleNotificationCleanup } = require("./utils/cronjobs");
const dotenv = require("dotenv");

const getCurrentBranch = () => {
  const execSync = require("child_process").execSync;
  return execSync("git rev-parse --abbrev-ref HEAD").toString().trim();
};


const currentBranch = getCurrentBranch();
if (currentBranch === "prod") {
    dotenv.config({ path: "./config.prod.env" });
    console.log("Loaded production environment variables.");
} else {
    dotenv.config({ path: "./config.dev.env" });
    console.log("Loaded development environment variables.");
} 

console.log('AWS_REGION:', process.env.AWS_REGION);
console.log('PORT:', process.env.PORT);  

const DB = process.env.DATABASE.replace(
  "<PASSWORD>",
  process.env.DATABASE_PASSWORD
);
console.log(DB);
mongoose
  .connect(DB)
  .then(() => console.log("DB connection successful"))
  .catch(err => console.error("DB connection error:", err));

  // scheduleTaskStatusUpdate();
  // scheduleNotificationCleanup(); 
const PORT = process.env.PORT;
app.listen(process.env.PORT, () => {
  console.log("App running on port", PORT);
});