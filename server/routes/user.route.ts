import express from "express";
import { updateAccessToken, activateUser, loginUser, logoutUser, registerUser, getUserInfo, socialAuth, updateUserInfo, updateUserPassword, updateAvatar } from "../controllers/user.controller";
import { isRole, isAuthenticated } from "../middleware/auth";

const userRouter = express.Router();

userRouter.post('/register', registerUser);

userRouter.post('/activate', activateUser);

userRouter.post('/login', loginUser);

userRouter.get('/logout', isAuthenticated, isRole("admin", "user"), logoutUser);

userRouter.get('/refresh', updateAccessToken);

userRouter.get('/user', isAuthenticated, getUserInfo);

userRouter.post('/social-auth', socialAuth);

userRouter.put('/user', isAuthenticated, updateUserInfo);

userRouter.put('/user/password', isAuthenticated, updateUserPassword);

userRouter.put('/user/avatar', isAuthenticated, updateAvatar);

export default userRouter;