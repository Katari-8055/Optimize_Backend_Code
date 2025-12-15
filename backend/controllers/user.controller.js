import { asyncHandler } from "../utils/asyncHandler.js";
import {User} from "../models/User.model.js"
import ApiError from "../utils/ApiError.js"
import {uploadToCloudinary} from "../utils/cloudinary.js"
import ApiResponse from "../utils/ApiResponse.js";


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
    if(req.files && Array.isArray(req.files.coverImage 
        && req.files.coverImage.length > 0)){
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