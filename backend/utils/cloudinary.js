import {v2 as cloudinary} from 'cloudinary';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();


cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
})

const uploadToCloudinary = async (localFilePath)=>{
    try {
        if(!localFilePath) return null;
        // Upload file to cloudinary
        const response = await cloudinary.uploader.upload(localFilePath,
            {resource_type: "auto"});
        //file uploaded
       // console.log("File uploaded to Cloudinary successfully", response.url);
       fs.unlinkSync(localFilePath); //remove file from local uploads folder
       //console.log(response);
        return response;
    }catch (error) {
        console.log("Error uploading file to Cloudinary", error);
        fs.unlinkSync(localFilePath); //remove file from local uploads folder
        return null;
    }
}

export {uploadToCloudinary};