// twitterListener.js
require('dotenv').config(); // For local development, loads env vars from .env
const Twit = require('twit');
const { Kafka } = require('kafkajs');

// Fetch secrets from environment variables or Choreo secrets
const twitterConfig = {
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token: process.env.TWITTER_ACCESS_TOKEN,
  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
};

const kafkaBrokerUrl = process.env.KAFKA_BROKER_URL;
const kafkaTopic = process.env.KAFKA_TOPIC || 'kubecon_tweets'; // Default topic if not set

// Initialize Twitter client
const T = new Twit(twitterConfig);

// Initialize Kafka producer
const kafka = new Kafka({
  clientId: 'twitter-listener',
  brokers: [kafkaBrokerUrl],
});
const producer = kafka.producer();

// Stream tweets related to KubeCon
const stream = T.stream('statuses/filter', { track: ['#KubeCon'] });

async function run() {
  await producer.connect();

  console.log('Twitter Listener started. Listening for tweets...');

  stream.on('tweet', async (tweet) => {
    const tweetData = {
      tweet_id: tweet.id_str,
      username: tweet.user.screen_name,
      text: tweet.text,
      timestamp: tweet.created_at,
      hashtags: tweet.entities.hashtags.map((hashtag) => hashtag.text),
    };

    console.log('New tweet received:', tweetData);

    try {
      await producer.send({
        topic: kafkaTopic,
        messages: [{ value: JSON.stringify(tweetData) }],
      });
      console.log('Tweet sent to Kafka:', tweetData);
    } catch (err) {
      console.error('Error sending tweet to Kafka:', err);
    }
  });

  stream.on('error', (error) => {
    console.error('Error in Twitter stream:', error);
  });
}

run().catch(console.error);
