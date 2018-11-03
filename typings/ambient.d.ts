declare module 'is-base64' {
  type Base64Fn = (value: string) => boolean

  const isBase64: Base64Fn
  export = isBase64
}
