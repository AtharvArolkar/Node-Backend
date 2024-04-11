import { User } from '../models/user.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';

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
    [userName, email, fullName, password].some((field) => field?.trim() === '')
  ) {
    throw new ApiError(400, 'All fields are required');
  }

  const existingUser = User.findOne({
    $or: [{ userName }, { email }],
  });

  if (existingUser) {
    throw new ApiError(409, 'User with email or username already exists');
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverImage[0].path;

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

export { registerUser };
