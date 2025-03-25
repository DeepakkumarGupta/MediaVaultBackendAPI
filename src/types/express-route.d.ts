import { Request, Response, NextFunction } from 'express';

/**
 * Common type for route handlers with flexible return types
 * This allows handlers to:
 * 1. Return nothing (void) or a Promise<void>
 * 2. Return a Response object or Promise<Response>
 * 3. Return undefined or Promise<undefined>
 * 
 * All of these patterns are valid in Express route handlers
 */
export type RouteHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void | Response<any, Record<string, any>> | undefined> | void;

export {};