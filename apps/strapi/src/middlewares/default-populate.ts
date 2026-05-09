import type { Core } from '@strapi/strapi';

/**
 * Global middleware that defaults `populate=*` on all GET requests under /api/*
 * so REST consumers get relations and media without having to opt in.
 * Callers can override by passing their own `populate` query param.
 */
const middleware: Core.MiddlewareFactory = () => {
  return async (ctx, next) => {
    const isApiGet =
      ctx.request.method === 'GET' && ctx.request.url.startsWith('/api/');

    if (isApiGet) {
      ctx.query = ctx.query ?? {};
      const hasPopulate =
        ctx.query.populate !== undefined &&
        ctx.query.populate !== null &&
        ctx.query.populate !== '';
      if (!hasPopulate) {
        ctx.query.populate = '*';
      }
    }

    await next();
  };
};

export default middleware;
