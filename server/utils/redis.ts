import { Redis } from "ioredis";
require("dotenv").config();

const url = process.env.REDIS_URL;

const redisClient = () => {
  if (url) {
    console.log("Redis connected");
    return url;
  }
  throw new Error("Redis connection failed");
};

export const redis = new Redis(redisClient(), {
  tls: {
    rejectUnauthorized: false,
  },
});
