import { Request, Response, NextFunction, RequestHandler } from 'express';
import { RouteHandler } from '../types/express-route';

/**
 * This wrapper helps with TypeScript typing issues in route handlers
 * It allows controllers to return Response objects without TypeScript errors
 * by converting async route handlers to standard Express handlers.
 */
export const asyncHandler = (fn: RouteHandler): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next))
      .catch(next);
  };
};