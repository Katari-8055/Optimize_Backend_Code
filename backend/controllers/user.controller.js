import { asyncHandler } from "../utils/asyncHandler.js";
import {User} from "../models/User.model.js"
import ApiError from "../utils/ApiError.js"
import {uploadToCloudinary} from "../utils/cloudinary.js"
import ApiResponse from "../utils/ApiResponse.js";

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