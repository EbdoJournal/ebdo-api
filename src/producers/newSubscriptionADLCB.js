import Producer from 'sqs-producer'
import { logger } from '../lib/logger'
import { env } from '../lib/env'
import uniqid from 'uniqid'

const producer = Producer.create({
  queueUrl: `https://sqs.${env.AWS_AREA}.${env.AWS_URL_BASE}${
    env.AWS_URL_NEW_SUBSCRIPTION_ADL_CB
  }`,
  region: env.AWS_AREA,
  accessKeyId: env.AWS_KEY_ID,
  secretAccessKey: env.AWS_ACCESS_KEY
})

export default async function newSubscriptionADLCB(message) {
  message.queueName = env.AWS_URL_NEW_ADDRESS
  const params = {
    body: JSON.stringify(message),
    id: uniqid('producer-newSubscription-adl-cb-')
  }

  return producer.send(params, err => {
    logger.debug(err)
  })
}
