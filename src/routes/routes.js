export const apiVersion = 'v1';

export const api = `/api/${apiVersion}`;

export const userBaseRoute = `${api}/users`;
export const userRoutes = {
  register: '/register',
  login: '/login',
  logout: '/logout',
  refreshAccessToken: '/refreshAccessToken',
  changePassword: '/changePassword',
  getCurrentuser: '/getCurrentuser',
  updateAccountDetails: '/updateAccountDetails',
  updateUserAvatar: '/updateUserAvatar',
  updateUserCoverImage: '/updateUserCoverImage',
};
