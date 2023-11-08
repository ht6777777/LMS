import { Response } from "express";
import userModel from "../models/user.model";
import { redis } from "../utils/redis";

export const getUserById = async (id: string, res: Response) => {
  // const user = await userModel.findById(id);

  const user = await redis.get(id);

  if (user) {
    res.status(200).json({
      success: true,
      user: JSON.parse(user),
    });
  }
};