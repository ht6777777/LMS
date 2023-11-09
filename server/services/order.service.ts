import { NextFunction } from "express";
import { CatchAsyncErrors } from "../middleware/catchAsyncErrors";
import orderModel from "../models/order.model";

export const newOrder = CatchAsyncErrors(
  async (data: any, next: NextFunction) => {
    const order = await orderModel.create(data);

    next(order);
  }
);
