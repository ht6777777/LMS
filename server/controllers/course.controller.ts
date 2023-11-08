import { NextFunction, Request, Response } from "express";
import { CatchAsyncErrors } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import cloudinary from "cloudinary";
import { createCourse } from "../services/course.service";
import courseModel from "../models/course.model";
import { redis } from "../utils/redis";
import mongoose from "mongoose";
import ejs from "ejs";
import path from "path";
import sendMail from "../utils/sendMail";

// upload new course
export const uploadCourse = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body;
      const thumbnail = data.thumbnail;

      if (thumbnail) {
        const cloud = await cloudinary.v2.uploader.upload(thumbnail, {
          folder: "courses",
        });

        data.thumbnail = {
          public_id: cloud.public_id,
          url: cloud.secure_url,
        };
      }

      // create course
      createCourse(data, res, next);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// edit course
export const editCourse = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body;
      const thumbnail = data.thumbnail;

      if (thumbnail) {
        await cloudinary.v2.uploader.destroy(thumbnail.public_id);
        const cloud = await cloudinary.v2.uploader.upload(thumbnail, {
          folder: "course",
        });

        data.thumbnail = {
          public_id: cloud.public_id,
          url: cloud.secure_url,
        };
      }

      const courseId = req.params.id;

      const course = await courseModel.findByIdAndUpdate(
        courseId,
        { $set: data },
        { new: true }
      );

      res.status(200).json({
        success: true,
        course,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// get single course - without purchasing
export const getSingleCourse = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const courseId = req.params.id;

      const isCacheExist = await redis.get(courseId);

      let course;

      if (isCacheExist) {
        console.log("from redis");
        course = JSON.parse(isCacheExist);
      } else {
        console.log("from mongodb");
        course = await courseModel
          .findById(courseId)
          .select(
            "-courseData.link -courseData.videoUrl -courseData.suggestions -courseData.questions"
          );

        await redis.set(courseId, JSON.stringify(course));
      }

      res.status(200).json({
        success: true,
        course,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// get single course - without purchasing
export const getAllCourses = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const isCacheExist = await redis.get("all-courses");
      let courses;

      if (isCacheExist) {
        console.log("from redis");
        courses = JSON.parse(isCacheExist);
      } else {
        console.log("from mongodb");
        courses = await courseModel
          .find()
          .select(
            "-courseData.link -courseData.videoUrl -courseData.suggestions -courseData.questions"
          );

        redis.set("all-courses", JSON.stringify(courses));
      }

      res.status(200).json({
        success: true,
        courses,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// get course - only if purchased by user?
export const getSingleCourseByUser = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const courses = req.user?.courses;
      const courseId = req.params.id;

      console.log(courseId, courses);

      const isCourseExist = courses?.find(
        (course: any) => course._id === courseId
      );

      if (!isCourseExist) {
        return next(
          new ErrorHandler("You are not eligible to access this course", 404)
        );
      }

      const course = await courseModel.findById(courseId);
      const content = course?.courseData;

      res.status(200).json({
        success: true,
        content,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

interface IAddQuestionData {
  courseId: string;
  contentId: string;
  question: string;
}

// add question in course - course data
export const addQuestion = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { courseId, contentId, question }: IAddQuestionData = req.body;

      if (!mongoose.Types.ObjectId.isValid(courseId)) {
        return next(new ErrorHandler("Invalid course id", 400));
      }

      const course = await courseModel.findById(courseId);

      if (!mongoose.Types.ObjectId.isValid(contentId)) {
        return next(new ErrorHandler("Invalid content id", 400));
      }

      const content = course?.courseData.find(
        (item: any) => item._id.equals(contentId) // equals works but === doesn't - cause id is ObjectId in mongodb and their ref is not same hence === is false ?
      );

      if (!content) {
        return next(new ErrorHandler("Invalid content id", 400));
      }

      const newQuestion: any = {
        user: req.user,
        question,
        questionReplies: [],
      };

      content.questions.push(newQuestion);

      await course?.save();

      res.status(200).json({
        success: true,
        course,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

interface IAddAnswerData {
  courseId: string;
  contentId: string;
  questionId: string;
  answer: string;
}

// add answer to question in course
export const addAnswer = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { courseId, contentId, questionId, answer }: IAddAnswerData =
        req.body;

      const course = await courseModel.findById(courseId);

      if (!mongoose.Types.ObjectId.isValid(contentId)) {
        return next(new ErrorHandler("Invalid content id", 400));
      }

      const content = course?.courseData.find((item: any) =>
        item._id.equals(contentId)
      );

      if (!content) {
        return next(new ErrorHandler("Invalid content id", 400));
      }

      const question = content.questions.find((item: any) =>
        item._id.equals(questionId)
      );

      if (!question) {
        return next(new ErrorHandler("Invalid question id", 400));
      }

      const newAnswer: any = {
        answer,
        user: req.user,
      };

      question.questionReplies?.push(newAnswer);
      await course?.save();

      if (req.user?._id === question.user._id) {
        // notification
      } else {
        // mail
        const data = {
          name: question.user.name,
          title: content.title,
        };

        const html = ejs.renderFile(
          path.join(__dirname, "../mails/question-reply.ejs"),
          data
        );

        try {
          await sendMail({
            email: question.user.email,
            subject: "Question reply",
            template: "question-reply.ejs",
            data,
          });
        } catch (error: any) {
          return next(new ErrorHandler(error.message, 500));
        }
      }

      res.status(200).json({
        success: true,
        course,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

interface IAddReviewData {
  userId: string;
  review: string;
  rating: number;
}

// add review to course 
export const addReview = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const courseId = req.params.id;
      const courses = req.user?.courses;

      // check if user has purchased the course - only then he/she can review it
      const isCourseExist = courses?.find(
        (course: any) => course._id === courseId
      );

      if (!isCourseExist) {
        return next(
          new ErrorHandler("You are not eligible to access this course", 401)
        );
      }

      const course = await courseModel.findById(courseId);

      const { review, rating } = req.body;

      const newReview: any = {
        comment: review,
        rating,
        user: req.user,
      };

      // check if user already has a review to avoid multiple reviews

      course?.reviews.push(newReview);

      let avg = 0;

      course?.reviews.forEach((rev) => {
        avg += rev.rating;
      });

      if (course) {
        course.ratings = avg / course?.reviews.length;
      }

      await course?.save();

      const notification = {
        title: "New Review Received",
        message: `${req.user?.name} has given a review in ${course?.name}`,
      };

      // create notification

      res.status(200).json({
        success: true,
        course,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// export const name = CatchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
//     try {

//     }
//     catch(error: any) {
//         return next(new ErrorHandler(error.message, 500));
//     }
// })
