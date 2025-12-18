import { asyncHandler } from "../utils/asyncHandler.js";
import {User} from "../models/User.model.js"
import ApiError from "../utils/ApiError.js"
import {deleteToCloudinary, uploadToCloudinary} from "../utils/cloudinary.js"
import ApiResponse from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"

//--------------------Generating AccesAndRefressToken--------------------//

const generateAccessAndRefressToken = async(userId) =>{
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });


        return {accessToken, refreshToken}

    } catch (error) {
        throw new ApiError(500, "Somthings went wront in generating Refresh and accees token");
    }
} 


export const registerUser = asyncHandler(async (req, res)=>{
    const {fullname, email, username, password} = req.body;
    
    if([fullname, email, username, password].some((feild)=>
    feild?.trim()==="")){
        throw new ApiError(400, "All fields are required");
    }

    const userExists = await User.findOne({
        $or: [{email}, {username}]
    })

    if(userExists){
        throw new ApiError(400, "User already exists");
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    //const coverImages = req.files?.coverImage[0]?.path;

    let coverImages;
    if(req.files && Array.isArray(req.files.coverImage)
        && req.files.coverImage.length > 0){
            coverImages = req.files.coverImage[0].path;
    }

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar Field Required at Multer Stage");
    }
    
    // console.log(avatarLocalPath);

    const avatar = await uploadToCloudinary(avatarLocalPath);
    const coverImage = await uploadToCloudinary(coverImages);
    
    if(!avatar){
        throw new ApiError(400, "Avatar Field Required");
    }

    const newUser = await User.create({
        fullname,
        email,
        username: username.toLowerCase(),
        password,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
    });

    // console.log(newUser);

    const createdUser = await User.findById(newUser._id).select(
        "-password -refreshToken"
    );

    if(!createdUser){
        throw new ApiError(500, "User not created");
    
    }

    return res.status(201).json(
        new ApiResponse(201, "User Created", createdUser) 
    )

})

export const loginUser = asyncHandler(async (req, res)=>{
    const {username, password, email} = req.body;

    if(!(username || email)){
        throw new ApiError(400, "Username or Email is required");
    }

    const user = await User.findOne({
        $or: [
            username ? { username } : null,
            email ? { email } : null
        ].filter(Boolean)
    });

    if(!user){
        throw new ApiError(400, "User Is not Found");
    }

    const isPasswordMatched = await user.isPasswordMatched(password);

    if(!isPasswordMatched){
        throw new ApiError(400, "Invalid Password");
    }

    const {accessToken, refreshToken} = await generateAccessAndRefressToken(user._id);

    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200,
            
            {
                user: loggedInUser,
                accessToken,
                refreshToken,
            },
            "User Logged In SuccesFully"
        )
    )
})


export const logoutUser = asyncHandler(async (req, res)=>{
   await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
            refreshToken: undefined,
            },
        },
        {
            new: true,
        
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User Logged Out"))
    
        
})


export const refreshToken = asyncHandler(async (req, res)=>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if(!incomingRefreshToken){
        throw new ApiError(401, "Refresh Token is required");
    }
    
    try {
        const decodedToken = jwt.verify(
        incomingRefreshToken,
        process.env.REFRESH_TOKEN_SECRET,)
    
        const user = await User.findById(decodedToken?._id);

        if(!user){
            throw new ApiError(401, "Invalid Refresh token");
        }

        if(user.refreshToken !== incomingRefreshToken){
            throw new ApiError(401, "Refresh token Expired");
        }

        const option = {
            httpOnly: true,
            secure: true,
        }

        const {accessToken, newRefreshToken} = await generateAccessAndRefressToken(user._id);

        return res
        .status(200)
        .cookie("accessToken", accessToken, option)
        .cookie("refreshToken", newRefreshToken, option)
        .json(
            new ApiResponse(
                200,
                {accessToken, refreshToken: newRefreshToken},
                "Access Token Refreshed"
           )    
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Refresh Token")
    }
})

export const changeCurrentPassword = asyncHandler(async (req, res)=>{
    const {oldPassword, newPassword} = req.body;

    const user = await User.findById(req.user._id);

    const isPasswordMatched = await user.isPasswordMatched(oldPassword);

    if(!isPasswordMatched){
        throw new ApiError(400, "Invalid Old Password");
    }

    user.password = newPassword;
    await user.save({validateBeforeSave: false});

    return res.status(200)
    .json(new ApiResponse(200, {}, "Password Changed"))

    
})

export const getUser = asyncHandler(async ()=>{
    return res.status(200).json(new ApiResponse(200, req.user, "User Fetched"));
})

export const updateUser = asyncHandler(async (req, res)=>{
    const {fullname, email} = req.body;

    if(!fullname || !email){
        throw new ApiError(400, "All fields are required");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullname,
                email: email.toLowerCase(),
            }
        },
        {new: true}
    ).select("-password -refreshToken");

    return res.status(200).json(new ApiResponse(200, user, "User Updated"));
})

export const updateUserAvatar = asyncHandler(async (req, res)=>{
    const avatarLocalPath = req.file?.path;
    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar Field Required at Multer Stage");
    }

    // code for deleting old avatar

    // const user = await User.findById(req.user?._id).select("-password -refreshToken");
    // if(user.avatar?.public_id){
    //     await deleteToCloudinary(user.avatar.public_id);
    // }


    const avatar = await uploadToCloudinary(avatarLocalPath);

    if(!avatar.url){
        throw new ApiError(400, "Error While Uploading on Avatar");
    }

    user.avatar = avatar.url;
    await user.save({validateBeforeSave: false});


    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar: avatar.url,
            }
        },
        {new: true}
    ).select("-password -refreshToken");

    return res.status(200).json(new ApiResponse(200, user, "Avatar Updated Successfully"))
    
})