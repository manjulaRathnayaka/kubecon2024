# Twitter Listener Microservice

This microservice listens for tweets related to the hashtag `#KubeCon`, processes them, and sends them to a Kafka topic for downstream consumption.

## Prerequisites

- Node.js installed
- Kafka broker available
- Twitter API keys (Consumer Key, Consumer Secret, Access Token, Access Token Secret)

## Environment Variables

Ensure the following environment variables are set in your environment or within a `.env` file for local development:

- `TWITTER_CONSUMER_KEY`
- `TWITTER_CONSUMER_SECRET`
- `TWITTER_ACCESS_TOKEN`
- `TWITTER_ACCESS_TOKEN_SECRET`
- `KAFKA_BROKER_URL`
- `KAFKA_TOPIC` (optional, defaults to `kubecon_tweets`)

## Running Locally

```bash
npm install
npm start
