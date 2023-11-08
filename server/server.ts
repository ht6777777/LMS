import { app } from "./app";
import connectDB from "./utils/db";
import {v2 as cloudinary} from "cloudinary";

require("dotenv").config();

const PORT = process.env.PORT;

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET
})

app.listen(PORT, () => {
    console.log(`Server is running on Port ${PORT}`);
    connectDB();
})