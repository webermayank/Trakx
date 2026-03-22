import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import apiRoutes from "./routes/v1/index.js";

const app = express();

app.use(cors({
    origin: "http://localhost:8081", // Allow all origins
    credentials: true
}));

app.use(express.json());
app.use("/api/v1", apiRoutes);

app.listen(5050, () => {
  console.log("Server is running on port 5050");
});
