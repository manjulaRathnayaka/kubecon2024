require('dotenv').config();
const axios = require('axios');

// Fetch OAuth credentials and other configurations from environment variables
const clientId = process.env.TWITTER_CLIENT_ID;
const clientSecret = process.env.TWITTER_CLIENT_SECRET;
const twitterHashtag = process.env.TWITTER_HASHTAG || 'KubeCon';
const pollInterval = process.env.POLL_INTERVAL || 60000; // Polling interval in milliseconds (default: 1 minute)

// Function to obtain a Bearer Token using OAuth 2.0 Client Credentials Flow
async function getBearerToken(clientId, clientSecret) {
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  try {
    const response = await axios.post(
      'https://api.twitter.com/oauth2/token',
      'grant_type=client_credentials',
      {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        },
      }
    );
    return response.data.access_token; // This is your Bearer Token
  } catch (error) {
    console.error('Failed to obtain Bearer Token:', error.response?.data || error.message);
    throw error;
  }
}

// Function to search for tweets using the Bearer Token
async function searchTweets(bearerToken, hashtag) {
  try {
    const query = encodeURIComponent(`#${hashtag}`);
    const url = `https://api.twitter.com/2/tweets/search/recent?query=${query}&tweet.fields=created_at,author_id,text,entities`;
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${bearerToken}`,
      },
    });
    return response.data.data || [];
  } catch (error) {
    console.error('Error searching tweets:', error.response?.data || error.message);
    return [];
  }
}

// Function to run the Twitter Listener using the Bearer Token
async function run() {
  // Obtain the Bearer Token
  const bearerToken = await getBearerToken(clientId, clientSecret);
  console.log('Obtained Bearer Token:', bearerToken);

  console.log(`Twitter Listener started. Polling for tweets with hashtag "${twitterHashtag}" every ${pollInterval / 1000} seconds...`);

  // Poll for tweets at regular intervals
  setInterval(async () => {
    const tweets = await searchTweets(bearerToken, twitterHashtag);

    if (tweets.length === 0) {
      console.log('No new tweets found.');
    }

    tweets.forEach((tweet) => {
      const tweetData = {
        tweet_id: tweet.id,
        username: tweet.author_id,
        text: tweet.text,
        timestamp: tweet.created_at,
        hashtags: tweet.entities?.hashtags?.map((tag) => tag.tag) || [],
      };

      console.log('New tweet received:', tweetData);
    });
  }, pollInterval);
}

run().catch(console.error);
