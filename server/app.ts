import cookieParser from "cookie-parser";
import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import { ErrorMiddleware } from "./middleware/error";
import userRouter from "./routes/user.route";
import courseRouter from "./routes/course.route";
import orderRouter from "./routes/order.route";
require("dotenv").config();

export const app = express();

// body parser
app.use(express.json({ limit: "50mb" }));

app.use(
  cors({
    origin: process.env.ORIGIN,
  })
);

app.use(cookieParser());

app.use("/api/v1", userRouter, courseRouter, orderRouter);

// test API
app.get("/test", (req: Request, res: Response, next: NextFunction) => {
  res.status(200).json({
    success: true,
    message: "API is working",
  });
});

// unknown routes
app.all("*", (req: Request, res: Response, next: NextFunction) => {
  const err = new Error(`Route ${req.originalUrl} not found!`) as any;
  err.statusCode = 404;
  next(err);
});

app.use(ErrorMiddleware);
