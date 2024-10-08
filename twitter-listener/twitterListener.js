require('dotenv').config(); // For local development, loads env vars from .env
const Twit = require('twit');
const { Kafka } = require('kafkajs');

// Fetch configuration from environment variables or use defaults
const twitterConfig = {
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token: process.env.TWITTER_ACCESS_TOKEN,
  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
};

const kafkaBrokerUrl = process.env.KAFKA_BROKER_URL;
const kafkaTopic = process.env.KAFKA_TOPIC || 'kubecon_tweets'; // Default topic if not set
const twitterHashtag = process.env.TWITTER_HASHTAG || '#KubeCon'; // Configurable hashtag

// Initialize Twitter client
const T = new Twit(twitterConfig);

// Initialize Kafka producer
const kafka = new Kafka({
  clientId: 'twitter-listener',
  brokers: [kafkaBrokerUrl],
});
const producer = kafka.producer();

// Stream tweets based on the configurable hashtag
const stream = T.stream('statuses/filter', { track: [twitterHashtag] });

// Kafka Connection Helper (Auto-retry)
async function connectKafkaProducer() {
  let retries = 0;
  const maxRetries = 5;

  while (retries < maxRetries) {
    try {
      await producer.connect();
      console.log('Kafka connected successfully');
      return;
    } catch (error) {
      retries += 1;
      console.error(`Error connecting to Kafka (attempt ${retries}):`, error.message);
      if (retries < maxRetries) {
        console.log('Retrying to connect to Kafka...');
        await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds before retrying
      } else {
        console.error('Max retries reached. Proceeding without Kafka.');
        return;
      }
    }
  }
}

async function run() {
  await connectKafkaProducer();

  console.log(`Twitter Listener started. Listening for tweets with hashtag "${twitterHashtag}"...`);

  // Event listener for new tweets
  stream.on('tweet', async (tweet) => {
    const tweetData = {
      tweet_id: tweet.id_str,
      username: tweet.user.screen_name,
      text: tweet.text,
      timestamp: tweet.created_at,
      hashtags: tweet.entities.hashtags.map((hashtag) => hashtag.text),
    };

    console.log('New tweet received:', tweetData);

    // Send tweet to Kafka topic (if Kafka is connected)
    if (producer.isConnected()) {
      try {
        await producer.send({
          topic: kafkaTopic,
          messages: [{ value: JSON.stringify(tweetData) }],
        });
        console.log('Tweet sent to Kafka:', tweetData);
      } catch (err) {
        console.error('Error sending tweet to Kafka:', err.message);
      }
    } else {
      console.log('Kafka is not connected. Skipping sending tweet to Kafka.');
    }
  });

  // Error handling for Twitter stream
  stream.on('error', (error) => {
    console.error('Error in Twitter stream:', error.message);
  });
}

// Run the listener
run().catch(console.error);
