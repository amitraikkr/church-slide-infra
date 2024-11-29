const OpenAI = require('openai');

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

async function generateSlideContent(topic, slideNumber, totalSlides, bibleVersion, theme) {
    const prompt = `Create content for slide ${slideNumber} of ${totalSlides} for a presentation with the following details:
    Topic: ${topic}
    Bible Version: ${bibleVersion}
    Theme: ${theme}
    
    Format the response as a JSON object with:
    - title
    - content (bullet points or paragraphs)
    - relevant_scripture (if applicable)`;

    const response = await client.chat.completions.create({
        model: "gpt-4-0125-preview",
        messages: [
            { role: "system", content: "You are a helpful assistant creating faith-based presentations." },
            { role: "user", content: prompt }
        ],
        temperature: 0.7
    });

    return JSON.parse(response.choices[0].message.content);
}

exports.handler = async (event, context) => {
    try {
        const body = JSON.parse(event.body);
        const { topic, slideCount, bibleVersion, theme } = body;

        const slides = [];
        for (let i = 0; i < slideCount; i++) {
            const slideContent = await generateSlideContent(
                topic,
                i + 1,
                slideCount,
                bibleVersion,
                theme
            );
            slides.push(slideContent);
        }

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ slides })
        };

    } catch (error) {
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ error: error.message })
        };
    }
};