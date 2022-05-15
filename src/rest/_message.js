const Router = require("@koa/router");
const Joi = require("joi");
const validate = require("./_validation.js");
const axios = require("axios");
const nodemailer = require('nodemailer');

const postMessage = async (ctx) => {

  const response = await axios.post("https://www.google.com/recaptcha/api/siteverify", {}, {
    params: {
      secret: "6LdZEmwfAAAAAO1NIMhL5tmoDwOWsB8lgzOCDwPR",
      response: ctx.request.body.token
    }
  })
  console.log("reCAPTCHA score: " + response.data?.score);
  if (response.data?.score < 0.5) {
    ctx.body = "FAIL"
    ctx.status = 403;
    return;
  }

  var mailOptions = {
    from: 'noreplyportfolio1@gmail.com',
    to: 'tuur.deschepper@outlook.com',
    subject: ctx.request.body.subject,
    text: `name: ${ctx.request.body.name}\nemail: ${ctx.request.body.email}\nmessage: ${ctx.request.body.message}`
  };

  await wrapedSendMail(mailOptions)
    .then(({ status, info }) => {
      if (!status) {
        ctx.body = "FAIL"
        ctx.status = 404;
        return;
      } else {
        ctx.body = "OK"
        return;
      }
    });
};
postMessage.validationScheme = {
  body: {
    name: Joi.string().required(),
    email: Joi.string().email().required(),
    subject: Joi.string().required(),
    message: Joi.string().required(),
    token: Joi.string().required(),
  }
};


async function wrapedSendMail(mailOptions) {
  return new Promise((resolve, reject) => {
    let transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'noreplyportfolio1@gmail.com',
        pass: '.X6%bv4aTPQd~a>/'
      }
    })
    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log("error is " + error);
        resolve({ status: false, info: error });
      }
      else {
        console.log('Email sent: ' + info.response);
        resolve({ status: true, info: info.response });
      }
    });
  })
};

module.exports = (app) => {
  const router = new Router({ prefix: "/message" });

  router.post("/", validate(postMessage.validationScheme), postMessage);

  app.use(router.routes()).use(router.allowedMethods());
};
