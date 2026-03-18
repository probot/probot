import { expectType } from "tsd";
import {
  createNodeMiddleware,
  createProbot,
  Probot,
  ProbotOctokit,
} from "../../src/index.js";

const MyOctokit = ProbotOctokit.plugin(() => {
  return {
    methods: {
      itWorks: async () => {},
    },
  };
});

type MyOctokitType = InstanceType<typeof MyOctokit>;

const typedApp = (bot: Probot<MyOctokitType>) => {
  bot.on("issues.opened", async (context) => {
    expectType<MyOctokitType>(context.octokit);
    await context.octokit.methods.itWorks();
  });
};

void createNodeMiddleware(typedApp, {
  probot: createProbot({
    defaults: { Octokit: MyOctokit },
  }),
});

void createNodeMiddleware(
  (bot) => {
    bot.on("issues.opened", async (context) => {
      expectType<MyOctokitType>(context.octokit);
      await context.octokit.methods.itWorks();
    });
  },
  {
    probot: createProbot({
      defaults: { Octokit: MyOctokit },
    }),
  },
);
