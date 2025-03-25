import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ValidationChain, validationResult, ValidationError } from 'express-validator';

/**
 * Middleware to validate request data using express-validator
 * @param validations Array of validation chains
 * @returns Middleware function that runs validations and handles errors
 */
export const validate = (validations: ValidationChain[]): RequestHandler => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void | Response<any, Record<string, any>>> => {
    // Execute all validations
    await Promise.all(validations.map(validation => validation.run(req)));

    // Check for validation errors
    const errors = validationResult(req);
    
    // If there are errors, return a 400 response with the errors
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map((error: ValidationError) => ({
          field: error.type === 'field' ? error.path : error.type,
          message: error.msg
        }))
      });
    }

    // No errors, continue to the next middleware
    next();
  };
};