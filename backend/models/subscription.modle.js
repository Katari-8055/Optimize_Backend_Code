import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema({
    suscriber:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    chennel:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }
},{timestamps:true})

export const subscription = mongoose.model('Subscription', subscriptionSchema);