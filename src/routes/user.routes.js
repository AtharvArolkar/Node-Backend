import { Router } from 'express';
import { registerUser } from '../controllers/user.controller.js';
import { userRoutes } from './routes.js';

const userRoute = Router();

userRoute.route(userRoutes.register).post(registerUser);

export default userRoute;
