// export const asyncHandler = (requestHandler) => {
//     return async (req, res, next) => {
//         Promise.resolve(requestHandler(req, res, next)).catch((err)=> next(err));
//     }
// }


// export const asyncHandler = (fn) => {}
// export const asyncHandler = (fn) => {async () =>{} }

export const asyncHandler = (fn) => async (req, res, next) =>{
    try {
        await fn(req, res, next);
    } catch (error) {
        res.status(error.code || 500).json({message: error.message, success: false});
    }
}