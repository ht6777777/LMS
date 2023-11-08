import { Response } from "express";
import { IUser } from "../models/user.model";
import { redis } from "./redis";

require("dotenv").config();

interface ITokenOptions {
  // expires: Date, // not req since maxAge is set
  maxAge: number;
  httpOnly: boolean;
  sameSite: "lax" | "strict" | "none" | undefined;
  secure?: boolean;
}

const accessTokenExpire = parseInt(process.env.ACCESS_TOKEN_EXP || "300");
const refreshTokenExpire = parseInt(process.env.REFRESH_TOKEN_EXP || "1200");

export const accessTokenOptions: ITokenOptions = {
  maxAge: accessTokenExpire * 60 * 1000,
  httpOnly: true,
  sameSite: "lax",
};

export const refreshTokenOptions: ITokenOptions = {
  maxAge: refreshTokenExpire * 24 * 60 * 60 * 1000,
  httpOnly: true,
  sameSite: "lax",
};

export const sendToken = (user: IUser, statusCode: number, res: Response) => {
  // upload session to redis
  redis.set(user._id, JSON.stringify(user) as any);

  const accessToken = user.SignAccessToken();
  const refreshToken = user.SignRefreshToken();

  if (process.env.NODE_ENV === "production") {
    accessTokenOptions.secure = true;
  }

  res.cookie("access_token", accessToken, accessTokenOptions); // name, value, options - provided by cookie-parser mw
  res.cookie("refresh_token", refreshToken, refreshTokenOptions);

  res.status(statusCode).json({
    success: true,
    user,
    accessToken,
  });
};
