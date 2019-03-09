declare module "is-base64" {
  interface Options {
    allowBlank: boolean
    paddingRequired: boolean
    mime: boolean
  }
  function isBase64(v: boolean | string | Buffer, opts?: Options): boolean
  export = isBase64
}
