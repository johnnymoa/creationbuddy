//codestral-latest
exports.sendMistralCodeMessage = async (req, res) => {
  const { guideId, messageList } = req.body;

  try {
    const guide = await Guide.findById(guideId).select('prompt');
    if (!guide) {
      return res.status(404).json({ error: 'Guide not found' });
    }

    const prompt = guide.prompt;

    const apiKey = 'Q3wJ5IgYiVKj52E4UjHY90thn6HqxQBh';
    const url = 'https://codestral.mistral.ai/v1/chat/completions';

    const response = await axios.post(url, {
      model: 'codestral-latest',
      messages: [{ role: 'system', content: prompt }, ...messageList],
      temperature: 0.7,
      top_p: 1,
      stream: false,
      safe_prompt: false,
      random_seed: 311095
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    const responseMessage = response.data.choices[0].message.content;
    messageList.push({ role: 'assistant', content: responseMessage });

    res.json({ messageList });

  } catch (error) {
    console.error('Error sending message to Mistral:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
};

//Mistral
exports.sendMessage = async (req, res) => {
  const { guideId, messageList } = req.body;

  try {
    const guide = await Guide.findById(guideId).select('prompt');
    if (!guide) {
      return res.status(404).json({ error: 'Guide not found' });
    }

    const prompt = guide.prompt;

    const apiKey = process.env.MISTRAL_API_KEY;
    const url = 'https://api.mistral.ai/v1/chat/completions';

    const response = await axios.post(url, {
      model: 'mistral-large-latest',
      messages: [{ role: 'system', content: prompt }, ...messageList],
      temperature: 0.7,
      top_p: 1,
      stream: false,
      safe_prompt: false,
      random_seed: 311095
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    const responseMessage = response.data.choices[0].message.content;
    messageList.push({ role: 'assistant', content: responseMessage });

    res.json({ messageList });

  } catch (error) {
    console.error('Error sending message to Mistral:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
};

//Open AI
exports.sendOpen4oMessage = async (req, res) => {
  const { guideId, messageList } = req.body;

  try {
    const guide = await Guide.findById(guideId).select('prompt');
    if (!guide) {
      return res.status(404).json({ error: 'Guide not found' });
    }

    const prompt = guide.prompt;

    const apiKey = process.env.OPENAI_API_KEY;
    const url = 'https://api.openai.com/v1/chat/completions';

    const response = await axios.post(url, {
      model: 'gpt-4o',
      messages: [{ role: 'system', content: prompt }, ...messageList],
      temperature: 0.7,
      top_p: 1,
      // stream: false,
      // safe_prompt: false,
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    const responseMessage = response.data.choices[0].message.content;
    messageList.push({ role: 'assistant', content: responseMessage });

    res.json({ messageList });

  } catch (error) {
    console.error('Error sending message to Mistral:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
};
//Gemini
exports.sendGeminiMessage = async (req, res) => {
  const { guideId, messageList } = req.body;

  try {
    const guide = await Guide.findById(guideId).select('prompt');
    if (!guide) {
      return res.status(404).json({ error: 'Guide not found' });
    }

    const prompt = guide.prompt;
    const apiKey = process.env.GEMINI_API_KEY;
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + apiKey;

    const updatedMessageList = messageList.map(({ content, ...rest }) => ({ ...rest, parts: content }));

    const response = await axios.post(url, {
      contents: [
        { role: 'model', parts: [{ text: prompt }] },
        ...updatedMessageList
      ],
      temperature: 0.7
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const responseMessage = response.data.candidates[0].content.parts.map(part => part.text).join(' ');
    messageList.push({ role: 'assistant', content: responseMessage });

    res.json({ messageList });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

//Open AI
exports.sendOpen35Message = async (req, res) => {
  const { guideId, messageList } = req.body;

  try {
    const guide = await Guide.findById(guideId).select('prompt');
    if (!guide) {
      return res.status(404).json({ error: 'Guide not found' });
    }

    const prompt = guide.prompt;

    const apiKey = process.env.OPENAI_API_KEY;
    const url = 'https://api.openai.com/v1/chat/completions';

    const response = await axios.post(url, {
      model: 'gpt-3.5-turbo-1106',//'gpt-4o',
      messages: [{ role: 'system', content: prompt }, ...messageList],
      temperature: 0.7,
      top_p: 1,
      // stream: false,
      // safe_prompt: false,
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    const responseMessage = response.data.choices[0].message.content;
    messageList.push({ role: 'assistant', content: responseMessage });

    res.json({ messageList });

  } catch (error) {
    console.error('Error sending message to Mistral:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
};

//GroQ
exports.sendGroqMessage = async (req, res) => {
  const { guideId, messageList } = req.body;

  try {
    const guide = await Guide.findById(guideId).select('prompt');
    if (!guide) {
      return res.status(404).json({ error: 'Guide not found' });
    }

    const prompt = guide.prompt;

    const apiKey = process.env.GROQ_API_KEY;
    const url = 'https://api.groq.com/openai/v1/chat/completions';

    const response = await axios.post(url, {
      model: 'llama3-70b-8192',
      messages: [{ role: 'system', content: prompt }, ...messageList],
      temperature: 0.7,
      // top_p: 1,
      // stream: false,
      // safe_prompt: false,
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    const responseMessage = response.data.choices[0].message.content;
    messageList.push({ role: 'assistant', content: responseMessage });

    res.json({ messageList });

  } catch (error) {
    console.error('Error sending message to Mistral:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
};