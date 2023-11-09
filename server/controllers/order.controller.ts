import { NextFunction, Request, Response } from "express";
import { CatchAsyncErrors } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import orderModel, { IOrder } from "../models/order.model";
import userModel from "../models/user.model";
import courseModel from "../models/course.model";
import { newOrder } from "../services/order.service";
import ejs from "ejs";
import path from "path";
import sendMail from "../utils/sendMail";
import notificationModel from "../models/notification.model";

export const createOrder = CatchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?._id;
        const {courseId, paymentInfo} = req.body as IOrder;

        const user = await userModel.findById(userId);

        // check if user already has purchased the course
        const isCourseExist = user?.courses.find((course: any) => course._id.equals(courseId));
        if(isCourseExist) {
            return next(new ErrorHandler("You have already purchased the course", 400));
        }

        const course = await courseModel.findById(courseId);
        
        // check if course exist 
        if(!course) {
            return next(new ErrorHandler("Course not found", 404));
        }

        const order: any = {
            courseId,
            userId
        }

        await orderModel.create(order);

        const mailData = {
            _id: courseId.toString().slice(0,5)+Math.floor(Math.random()*10000),
            name: course.name,
            price: course.price,
            date: new Date().toLocaleDateString('en-US', {year: 'numeric', month: 'long', day: 'numeric'})
        }

        const html = await ejs.renderFile(path.join(__dirname, "../mails/order-confirmation.ejs"), mailData);

        try {
            if(user) {
                await sendMail({
                    email: user.email,
                    subject: "Order Confirmation",
                    template: "order-confirmation.ejs",
                    data: mailData
                })
            }
        }
        catch (error: any) {
            return next(new ErrorHandler(error.message, 500));
        }

        user?.courses.push({courseId});

        await user?.save();

        const newNotification = await notificationModel.create({
            user: userId,
            title: "New order",
            message: `You have a new order - ${course.name}`
        })

        if(course.purchased) {
            course.purchased += 1;
        }

        await course.save();

        res.status(201).json({
            success: true,
            order
        })
    }
    catch(error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
})

// export const name = CatchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
//     try {

//     }
//     catch(error: any) {
//         return next(new ErrorHandler(error.message, 500));
//     }
// })