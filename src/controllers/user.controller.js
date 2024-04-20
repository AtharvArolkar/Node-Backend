import { User } from '../models/user.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
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

  if (!avatar) {
    throw new ApiError(500, 'Internal server error');
  }

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
      new ApiResponse(201, checkIfUserCreated, 'Successfully created the user')
    );
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
});

const logoutUser = asyncHandler(async (req, res) => {
  //clear cookies
  // remove refresh token from db

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

export { registerUser, loginUser, logoutUser, refreshAccessToken };
