import { NextFunction, Request, Response } from "express";
import { CatchAsyncErrors } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import userModel from "../models/user.model";
import jwt, { JwtPayload, Secret } from "jsonwebtoken";
import path from "path";
require("dotenv").config();
import ejs from "ejs";
import sendMail from "../utils/sendMail";
import {
  accessTokenOptions,
  refreshTokenOptions,
  sendToken,
} from "../utils/jwt";
import { redis } from "../utils/redis";
import { getUserById } from "../services/user.service";
import cloudinary from "cloudinary";

interface IUser {
  name: string;
  email: string;
  password: string;
  avatar?: string;
}

// register a user
export const registerUser = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email, password } = req.body;

      // check if user already exits
      const isEmailExist = await userModel.findOne({ email });

      if (isEmailExist) {
        return new ErrorHandler("Email already exits", 400);
      }

      const user: IUser = {
        name,
        email,
        password,
      };

      // generate jwt token
      const token = createToken(user);

      const data = {
        user: { name: user.name },
        activationCode: token.activationCode,
      };
      const html = ejs.renderFile(
        path.join(__dirname, "../mails/activation-email.ejs"),
        data
      );

      try {
        sendMail({
          email: user.email,
          subject: "Activate your account",
          template: "activation-mail.ejs", // why not html above?
          data,
        });

        res.status(201).json({
          success: true,
          message: `Please check your email ${user.email} to activate your account`,
          activateToken: token.activationToken, // why?
        });
      } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
      }
    } catch (err: any) {
      return next(new ErrorHandler(err.message, 400));
    }
  }
);

interface IToken {
  token: string;
  code: string;
}

// create jwt token
const createToken = (user: IUser) => {
  const activationCode = Math.floor(1000 + Math.random() * 9000).toString();

  const activationToken = jwt.sign(
    { user, activationCode },
    process.env.JWT_SECRET as Secret,
    {
      expiresIn: "5m",
    }
  );

  return {
    activationToken,
    activationCode,
  };
};

interface IActivationRequest {
  activation_token: string;
  activation_code: string;
}

// activate the user after register
export const activateUser = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { activation_token, activation_code } =
        req.body as IActivationRequest;

      const newUser: { user: IUser; activationCode: string } = jwt.verify(
        activation_token,
        process.env.JWT_SECRET as string
      ) as { user: IUser; activationCode: string };

      if (newUser.activationCode !== activation_code) {
        return next(new ErrorHandler("Invalid activation code", 400));
      }

      const { name, email, password } = newUser.user;

      // check if user already exist
      const isUserExists = await userModel.findOne({ email });
      if (isUserExists) {
        return next(new ErrorHandler("User already exist", 400));
      }

      // save user in DB
      const user = await userModel.create({
        name,
        email,
        password,
      });

      res.status(201).json({ success: true });
    } catch (err: any) {
      return next(new ErrorHandler(err.message, 400));
    }
  }
);

interface ILoginRequest {
  email: string;
  password: string;
}

// login user
export const loginUser = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body as ILoginRequest;

      if (!email || !password) {
        return next(new ErrorHandler("Please enter email and password", 400));
      }

      const user = await userModel.findOne({ email }).select("+password");
      if (!user) {
        return next(new ErrorHandler("User does not exist", 400));
      }

      const isPasswordMatch = await user.comparePassword(password);
      if (!isPasswordMatch) {
        return next(new ErrorHandler("Invalid Password", 400));
      }

      sendToken(user, 200, res);
    } catch (err: any) {
      return next(new ErrorHandler(err.message, 400));
    }
  }
);

// logout user
export const logoutUser = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.cookie("acesss_token", "", { maxAge: 1 });
      res.cookie("acesss_token", "", { maxAge: 1 });

      const userId = req.user?._id || "";
      redis.del(userId);

      res.status(200).json({
        success: true,
        message: "Logged out Successfully",
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// update access token
export const updateAccessToken = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refresh_token = req.cookies.refresh_token;

      const decoded = jwt.verify(
        refresh_token,
        process.env.REFRESH_TOKEN as string
      ) as JwtPayload;

      const msg = "Could not refresh token";
      if (!decoded) {
        return next(new ErrorHandler(msg, 400));
      }

      const session = await redis.get(decoded.id as string);
      if (!session) {
        return next(new ErrorHandler(msg, 400));
      }

      const user = JSON.parse(session);

      const accessToken = jwt.sign(
        {
          id: user._id,
        },
        process.env.ACCESS_TOKEN as string,
        {
          expiresIn: "5m",
        }
      );

      // don't need to create new refresh token
      // usually => access token 24h, refresh token few days, week then login again using email, pass
      const refreshToken = jwt.sign(
        {
          id: user._id,
        },
        process.env.REFRESH_TOKEN as string,
        {
          expiresIn: "3d",
        }
      );

      req.user = user;

      res.cookie("access_token", accessToken, accessTokenOptions);
      res.cookie("refresh_token", refreshToken, refreshTokenOptions);

      res.status(200).json({
        success: true,
        accessToken,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// get user info
export const getUserInfo = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?._id;
      getUserById(userId, res);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

interface ISocialAuth {
  email: string;
  name: string;
  avatar: string;
}

// social auth
export const socialAuth = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, name, avatar } = req.body as ISocialAuth;
      const user = await userModel.findOne({ email });

      if (!user) {
        const newUser = await userModel.create({ email, name, avatar });
        sendToken(newUser, 200, res);
      } else {
        sendToken(user, 200, res);
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

interface IUpdateUserInfo {
  email?: string,
  name?: string
}

// update user info
export const updateUserInfo = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email } = req.body as IUpdateUserInfo;
      const userId = req.user?._id;

      const user = await userModel.findById(userId);

      if (user && email) {
        // need to check if updated email doesn't already exist
        const isEmailExist = await userModel.findOne({ email });
        if (isEmailExist) {
          return next(new ErrorHandler("Email already exist", 400));
        }

        user.email = email;
      }

      if (user && name) {
        user.name = name;
      }

      await user?.save();

      await redis.set(userId, JSON.stringify(user)); // update cache in redis

      res.status(200).json({
        success: true,
        user,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

interface IUpdateUserPassword {
  oldPassword: string,
  newPassword: string
}

// update user password
export const updateUserPassword = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {

      const userId = req.user?._id;
      const {oldPassword, newPassword} = req.body as IUpdateUserPassword;
      const user = await userModel.findById(userId).select("+password");

      if(!oldPassword || !newPassword) {
        return next(new ErrorHandler("Please enter old and new password", 400));
      }

      if(!user) {
        return next(new ErrorHandler("User not found", 400));
      }

      const isPasswordMatch = await user?.comparePassword(oldPassword);
      if(!isPasswordMatch) {
        return next(new ErrorHandler("Old password is incorrect", 400));
      }

      user.password = newPassword;

      await user.save();
      await redis.set(userId, JSON.stringify(user));

      res.status(200).json({
        success: true,
        user
      })
    }
    catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);


// update avatar
export const updateAvatar = CatchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {avatar} = req.body;
    const userId = req.user?._id;
    const user = await userModel.findById(userId);

    if(user && avatar) {
      if(user.avatar.public_id) { // remove if avatar exist ~old 
        await cloudinary.v2.uploader.destroy(user.avatar.public_id);
      }

      const myCloud = await cloudinary.v2.uploader.upload(avatar, {
        folder: "avatars",
        width: 150
      });

      user.avatar = {
        public_id: myCloud.public_id,
        url: myCloud.secure_url
      };
    }
    
    await user?.save();
    await redis.set(userId, JSON.stringify(user));

    res.status(200).json({
      success: true,
      user
    })
  }
  catch(error: any) {
    return next(new ErrorHandler(error.message, 400));
  }
})