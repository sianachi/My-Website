import { Router } from "express";
import { adminAuthRouter } from "./auth.js";
import { adminBlogRouter } from "./blog.js";
import { adminContentRouter } from "./content.js";
import { adminCredentialsRouter } from "./credentials.js";
import { adminCvRouter } from "./cv.js";

export const adminRouter = Router();

adminRouter.use("/", adminAuthRouter);
adminRouter.use("/credentials", adminCredentialsRouter);
adminRouter.use("/content", adminContentRouter);
adminRouter.use("/blog", adminBlogRouter);
adminRouter.use("/cv", adminCvRouter);
