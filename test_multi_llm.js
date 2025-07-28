const mongoose = require('mongoose');
const { getMessagesWithMultiLLMSiblings } = require('./api/models/Message');

// Test function to verify multi-LLM sibling retrieval
async function testMultiLLMRetrieval() {
  try {
    // Connect to MongoDB (adjust connection string as needed)
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/LibreChat', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Test the function with a sample conversation ID
    // Replace this with an actual conversation ID from your database
    const testConversationId = 'test-conversation-id';
    const testUserId = 'test-user-id';

    const messages = await getMessagesWithMultiLLMSiblings(
      {
        conversationId: testConversationId,
        user: testUserId,
      },
      '-_id -__v -user',
    );

    console.log('Retrieved messages:', JSON.stringify(messages, null, 2));

    // Look for messages with multiLLMSiblings
    const messagesWithSiblings = messages.filter(
      (msg) => msg.multiLLMSiblings && msg.multiLLMSiblings.length > 0,
    );

    if (messagesWithSiblings.length > 0) {
      console.log('Found messages with multi-LLM siblings:', messagesWithSiblings.length);
      messagesWithSiblings.forEach((msg, index) => {
        console.log(`Message ${index + 1} has ${msg.multiLLMSiblings.length} sibling(s)`);
      });
    } else {
      console.log('No messages with multi-LLM siblings found');
    }
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

testMultiLLMRetrieval();
