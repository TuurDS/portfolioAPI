const Koa = require("koa");
const config = require("config");
const koaCors = require("@koa/cors");
const bodyParser = require("koa-bodyparser");
const { initializeLogger, getLogger } = require("./core/logging");
const { serializeError } = require("serialize-error");
const installRest = require("./rest");
const emoji = require("node-emoji");
const ServiceError = require("./core/serviceError");

const NODE_ENV = config.get("env");
const CORS_ORIGINS = config.get("cors.origins");
const CORS_MAX_AGE = config.get("cors.maxAge");
const LOG_LEVEL = config.get("log.level");
const LOG_DISABLED = config.get("log.disabled");

module.exports = async function createServer() {
  initializeLogger({
    level: LOG_LEVEL,
    disabled: LOG_DISABLED,
    isProduction: NODE_ENV === "production",
    defaultMeta: {
      NODE_ENV,
    },
  });

  const app = new Koa();

  app.use(
    koaCors({
      origin: (ctx) => {
        if (CORS_ORIGINS.indexOf(ctx.request.header.origin) !== -1) {
          return ctx.request.header.origin;
        }
        return CORS_ORIGINS[0];
      },
      allowHeaders: ["Accept", "Content-Type", "Authorization"],
      maxAge: CORS_MAX_AGE,
    })
  );

  app.use(async (ctx, next) => {
    const logger = getLogger();
    logger.info(`${emoji.get("fast_forward")} ${ctx.method} ${ctx.url}`);

    const getStatusEmoji = () => {
      if (ctx.status >= 500) return emoji.get("skull");
      if (ctx.status >= 400) return emoji.get("x");
      if (ctx.status >= 300) return emoji.get("rocket");
      if (ctx.status >= 200) return emoji.get("white_check_mark");
      return emoji.get("rewind");
    };

    try {
      await next();
      logger.info(`${getStatusEmoji()} ${ctx.method} ${ctx.status} ${ctx.url}`);
    } catch (error) {
      logger.info(`${getStatusEmoji()} ${ctx.method} ${ctx.status} ${ctx.url}`);
      throw error;
    }
  });

  app.use(async (ctx, next) => {
    try {
      await next();

      if (ctx.status === 404) {
        ctx.body = {
          code: "NOT_FOUND",
          message: `Unkown resource: ${ctx.url}`,
        };
      }
    } catch (error) {
      const logger = getLogger();
      logger.error("Error occured while handeling a request", {
        error: serializeError(error),
      });

      let statusCode = error.status || 500;
      let errorBody = {
        code: error.code || "INTERNAL_SERVER_ERROR",
        message: error.message,
        details: error.details || {},
        stack: NODE_ENV !== "production" ? error.stack : undefined,
      };
      if (error instanceof ServiceError) {
        if (error.isValidationFailed) statusCode = 400;
        if (error.isUnauthorized) statusCode = 401;
        if (error.isForbidden) statusCode = 403;
        if (error.isNotFound) statusCode = 404;
      }

      ctx.status = statusCode;
      ctx.body = errorBody;
    }
  });

  const logger = getLogger();

  app.use(bodyParser());

  installRest(app);

  return {
    getApp() {
      return app;
    },
    start() {
      return new Promise((resolve) => {
        const port = process.env.PORT || 9001;
        app.listen(port);
        logger.info(`🚀 Server listening on port ${port}`);
        resolve();
      });
    },

    async stop() {
      app.removeAllListeners();
      getLogger().info("Goodbye");
    },
  };
};
