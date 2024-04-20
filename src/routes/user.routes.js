import { Router } from 'express';
import {
  changeCurrentUserPassword,
  getCurrentuser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
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
userRouter.route(userRoutes.refreshAccessToken).post(refreshAccessToken);

//Secured routes

userRouter.route(userRoutes.logout).post(verifyJWT, logoutUser);
userRouter
  .route(userRoutes.changePassword)
  .put(verifyJWT, changeCurrentUserPassword);
userRouter.route(userRoutes.getCurrentuser).get(verifyJWT, getCurrentuser);
userRouter
  .route(userRoutes.updateAccountDetails)
  .put(verifyJWT, updateAccountDetails);
userRouter
  .route(userRoutes.updateUserAvatar)
  .put(upload.single('avatar'), verifyJWT, updateUserAvatar);
userRouter
  .route(userRoutes.updateUserCoverImage)
  .put(upload.single('coverImage'), verifyJWT, updateUserCoverImage);

export default userRouter;
