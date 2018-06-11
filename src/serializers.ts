import bunyan from 'bunyan'
import express from 'express'
import {PayloadRepository} from './context'

export const serializers: bunyan.StdSerializers = {

  event: (event: any) => {
    if (typeof event !== 'object' || !event.payload) {
      return event
    } else {
      let name = event.event
      if (event.payload && event.payload.action) {
        name = `${name}.${event.payload.action}`
      }

      return {
        event: name,
        id: event.id,
        installation: event.payload.installation && event.payload.installation.id,
        repository: event.payload.repository && event.payload.repository.full_name,
      }
    }
  },
  installation: (installation: Installation) => {
    if (installation.account) {
      return installation.account.login
    } else {
      return installation
    }
  },

  err: bunyan.stdSerializers.err,

  repository: (repository: PayloadRepository) => repository.full_name,

  req: bunyan.stdSerializers.req,

  // Same as buyan's standard serializers, but gets headers as an object
  // instead of a string.
  // https://github.com/trentm/node-bunyan/blob/fe31b83e42d9c7f784e83fdcc528a7c76e0dacae/lib/bunyan.js#L1105-L1113
  res: (res: ExpressResponseWithDuration) => {
    if (!res || !res.statusCode) {
      return res
    } else {
      return {
        duration: res.duration,
        headers: res.getHeaders(),
        statusCode: res.statusCode,
      }
    }
  }
}

interface Installation {
  account: {
    login: string
  }
}

interface ExpressResponseWithDuration extends express.Response {
  duration: any
}
