import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import apiRoutes from "./routes/v1/index.js";

const app = express();

app.use(cors({
    origin: true,
    credentials: true
}));

app.use(express.json({ limit: "5mb" }));
app.use("/api/v1", apiRoutes);

app.listen(5050, () => {
  console.log("Server is running on port 5050");
});
