declare module '@octokit/app' {
  interface Options {
    id: number,
    privateKey: string
  }

  declare class App {
    constructor (options: Options)

    public getSignedJsonWebToken(): string
    public getInstallationAccessToken({installationId: number}): Promise<string>
  }

  export = App
}
