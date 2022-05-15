const Router = require("@koa/router");

const InstallMessageRoute = require("./_message");


module.exports = (app) => {
  const router = new Router({ prefix: "/api", });

  InstallMessageRoute(router);


  app.use(router.routes()).use(router.allowedMethods());
};