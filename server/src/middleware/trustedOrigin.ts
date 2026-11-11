import type { RequestHandler } from 'express';

export const originNotAllowedError = {
  error: {
    code: 'ORIGIN_NOT_ALLOWED',
    message: 'The request origin is not allowed.',
  },
};

export function createTrustedOriginMiddleware(trustedOrigin: string): RequestHandler {
  return (request, response, next) => {
    if (request.get('origin') !== trustedOrigin) {
      response.status(403).json(originNotAllowedError);
      return;
    }

    next();
  };
}
