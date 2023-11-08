import { CatchAsyncErrors } from "../middleware/catchAsyncErrors";
import { NextFunction, Request, Response } from "express";
import courseModel from "../models/course.model";

export const createCourse = CatchAsyncErrors(async (data: any, res: Response) => {
    const course = await courseModel.create(data);

    res.status(201).json({
        success: true,
        course
    })
})