import Producer from 'sqs-producer'
import { logger } from '../lib/logger'
import { env } from '../lib/env'
import uniqid from 'uniqid'

const urlQueue = `https://sqs.${env.AWS_AREA}.${env.AWS_URL_BASE}${
  env.AWS_URL_NEW_CLIENT
}`

const producer = Producer.create({
  queueUrl: urlQueue,
  region: env.AWS_AREA,
  accessKeyId: env.AWS_KEY_ID,
  secretAccessKey: env.AWS_ACCESS_KEY
})

export default async function newClientProducer(message) {
  message.queueName = env.AWS_URL_NEW_ADDRESS
  const params = {
    body: JSON.stringify(message),
    id: uniqid('producer-newClient-')
  }

  return producer.send(params, err => {
    logger.debug(err)
  })
}
