import path from "path";
import express from "express";
import { Probot } from "../index";

export = ({
  app,
  getRouter,
}: {
  app: Probot;
  getRouter: () => express.Router;
}) => {
  const router = getRouter();

  router.get("/probot", (req, res) => {
    let pkg;
    try {
      pkg = require(path.join(process.cwd(), "package.json"));
    } catch (e) {
      pkg = {};
    }

    res.render("probot.hbs", pkg);
  });
  router.get("/", (req, res, next) => res.redirect("/probot"));
};
