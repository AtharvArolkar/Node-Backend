import { Router } from 'express';
import { registerUser } from '../controllers/user.controller.js';
import { userRoutes } from './routes.js';
import { upload } from '../middlewares/multer.middleware.js';

const userRoute = Router();

userRoute.route(userRoutes.register).post(
  upload.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'coverImage', maxCount: 1 },
  ]),
  registerUser
);

export default userRoute;
