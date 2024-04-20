import { Router } from 'express';
import {
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
} from '../controllers/user.controller.js';
import { userRoutes } from './routes.js';
import { upload } from '../middlewares/multer.middleware.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const userRouter = Router();

userRouter.route(userRoutes.register).post(
  upload.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'coverImage', maxCount: 1 },
  ]),
  registerUser
);

userRouter.route(userRoutes.login).post(loginUser);

//Secured routes

userRouter.route(userRoutes.logout).post(verifyJWT, logoutUser);
userRouter.route(userRoutes.refreshAccessToken).post(refreshAccessToken);

export default userRouter;
