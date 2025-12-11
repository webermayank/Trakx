import dotenv from "dotenv";
dotenv.config();

import express from "express";
import apiRoutes from "./routes/v1/index.js";

const app = express();

app.use(express.json());
app.use("/api/v1", apiRoutes);

app.listen(5050, () => {
  console.log("Server is running on port 5050");
});
