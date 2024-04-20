import { User } from '../models/user.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  deleteFromCloudinary,
  uploadOnCloudinary,
} from '../utils/cloudinary.js';
import jwt from 'jsonwebtoken';

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);

    const refreshToken = user.generateRefreshToken();
    const accessToken = user.generateAccessToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { refreshToken, accessToken };
  } catch (error) {
    throw new ApiError(
      500,
      'Something went wrong while generate access and refresh token'
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  //get user details from frontend
  // validation - not empty
  //check if user already exists [username, email]
  //check files present [images, avatar]
  //upload to cloudinary, avatar
  //create user object - create entry in DB
  //remove password and refresh token field from response
  // check for user creation
  // return response

  const { userName, email, fullName, password } = req.body;

  if (
    [userName, email, fullName, password].some(
      (field) => field === '' || field === undefined
    )
  ) {
    throw new ApiError(400, 'All fields are required');
  }

  const existingUser = await User.findOne({
    $or: [{ userName }, { email }],
  });

  if (existingUser) {
    throw new ApiError(409, 'User with email or username already exists');
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

  if (!avatarLocalPath) {
    throw ApiError(400, 'Avatar file is required');
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar.url) {
    throw new ApiError(500, 'Internal server error');
  }

  try {
    const user = await User.create({
      fullName,
      avatar: avatar.url,
      userName,
      email,
      password,
      coverImage: coverImage?.url ?? '',
    });

    const checkIfUserCreated = await User.findById(user._id).select(
      '-password -refreshToken'
    );

    if (!checkIfUserCreated) {
      throw new ApiError(500, 'Error occured while registering the user');
    }

    return res
      .status(201)
      .json(
        new ApiResponse(
          201,
          checkIfUserCreated,
          'Successfully created the user'
        )
      );
  } catch (error) {
    throw new ApiError(500, 'Internal server error');
  }
});

const loginUser = asyncHandler(async (req, res) => {
  // get user details from frontend from req body
  // username or email
  // find the user
  // if found, password check, if user not found, send response sayong user does not exist
  // if password is wrong, send response back saying invalid password or username
  // generate access and refresh token
  // send secure cookies

  const { email, userName, password } = req.body;
  if (!(userName || email)) {
    throw new ApiError(400, 'Username or email is required');
  }

  const searchUser = await User.findOne({ $or: [{ userName }, { email }] });

  if (!searchUser) {
    throw new ApiError(404, 'User does not exist');
  }

  const isPasswordValid = await searchUser.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid user credentials');
  }

  try {
    const { refreshToken, accessToken } = await generateAccessAndRefreshTokens(
      searchUser._id
    );

    const loggedInuser = await User.findById(searchUser._id).select(
      '-password -refreshToken'
    );

    const options = {
      httpOnly: true,
      secure: true,
    };

    return res
      .status(200)
      .cookie('accessToken', accessToken, options)
      .cookie('refreshToken', refreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            user: loggedInuser,
            accessToken,
            refreshToken,
          },
          'User logged in successfully'
        )
      );
  } catch (error) {
    throw new ApiError(500, 'Internal server error');
  }
});

const logoutUser = asyncHandler(async (req, res) => {
  //clear cookies
  // remove refresh token from db

  try {
    await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          refreshToken: undefined,
        },
      },
      {
        new: true, // will return the updated object
      }
    );
  } catch (error) {
    throw new ApiError(500, 'Internal server error');
  }

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie('accessToken', options)
    .clearCookie('refreshToken', options)
    .json(new ApiResponse(200, {}, 'User logged out'));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookie?.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, 'Unauthorized request');
  }

  try {
    const decodedToken = jwt.verify(incomingRefreshToken, REFRESH_TOKEN_SECRET);

    const user = await User.findById(decodedToken._id);

    if (!user) {
      throw new ApiError(401, 'Invalid refresh token');
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(501, 'Refresh token is expired or used');
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { refreshToken: newRefreshToken, accessToken: newAccessToken } =
      await generateAccessAndRefreshTokens(user._id);

    return res
      .status(200)
      .cookie('accessToken', newAccessToken, options)
      .cookie('refreshToken', newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { newAccessToken, newRefreshToken },
          'Access token refreshed'
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || 'Invalid refresh token');
  }
});

const changeCurrentUserPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  try {
    const user = await User.findById(req.user?._id);

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if (!isPasswordCorrect) {
      throw new ApiError(400, 'Invalid password');
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res
      .status(200)
      .json(new ApiResponse(200, {}, 'Password changes successfulyy'));
  } catch (error) {
    throw new ApiError(
      500,
      'internal server error occured while updating the password'
    );
  }
});

const getCurrentuser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, 'Current user fetched successfully'));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  //File update, create a seperate controller, to reduce network congestion by sending not reqired fields
  const { email, fullName } = req.body;

  if (!email && !fullName) {
    throw new ApiError(400, 'Send atleast one field to update');
  }

  const updateDetails = {};

  if (email) {
    updateDetails.email = email;
  }

  if (fullName) {
    updateDetails.fullName = fullName;
  }

  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.user?._id,
      {
        $set: updateDetails,
      },
      { new: true }
    ).select('-password -refreshToken');

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          updatedUser,
          'Account details updated successfully'
        )
      );
  } catch (error) {
    throw new ApiError(
      500,
      'Internale server error occured while updating the account details'
    );
  }
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const newAvatarLocalpath = req.file?.path;

  if (!newAvatarLocalpath) {
    throw new ApiError(400, 'Avatar file is required');
  }

  const avatar = await uploadOnCloudinary(newAvatarLocalpath);

  if (!avatar.url) {
    throw new ApiError(500, 'Internal server error');
  }

  try {
    const user = await User.findById(req.user?._id).select(
      '-password -refreshToken'
    );

    const oldAvatarUrl = user.avatar;

    user.avatar = avatar.url;

    await user.save({ validateBeforeSave: false });

    await deleteFromCloudinary(oldAvatarUrl);
    return res
      .status(200)
      .json(new ApiResponse(200, user, 'Avatar updated successfully'));
  } catch (error) {
    throw new ApiError(
      500,
      'Internal server error occured while updating the avatar image'
    );
  }
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const newCoverLocalpath = req.file?.path;

  if (!newCoverLocalpath) {
    throw new ApiError(400, 'Cover image file is required');
  }

  const coverImage = await uploadOnCloudinary(newCoverLocalpath);

  if (!coverImage.url) {
    throw new ApiError(500, 'Internal server error');
  }

  try {
    const user = await User.findById(req.user?._id).select(
      '-password -refreshToken'
    );

    const oldCoverImageUrl = user.coverImage;

    user.coverImage = coverImage.url;

    await user.save({ validateBeforeSave: false });

    await deleteFromCloudinary(oldCoverImageUrl);

    return res
      .status(200)
      .json(new ApiResponse(200, user, 'Cover image updated successfully'));
  } catch (error) {
    throw new ApiError(
      500,
      'Internal server error occured while updating the cover image'
    );
  }
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentUserPassword,
  getCurrentuser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
};
