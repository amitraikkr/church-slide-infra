const OpenAI = require('openai');

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

async function generateSlideContent(topic, slideNumber, totalSlides, bibleVersion, theme) {
    const prompt = `
        Create content for slide ${slideNumber} of ${totalSlides} for a presentation. The presentation is based on the following details:
        - **Topic**: ${topic}
        - **Bible Version**: ${bibleVersion}
        - **Theme**: ${theme}

        ### Instructions:
        1. Format the response as a **valid JSON object** with the following keys:
        - **title**: A concise and engaging title for the slide.
        - **content**: Either bullet points or paragraphs summarizing the key message for this slide.
        - **relevant_scripture**: A list of Bible verses (if applicable) that support the slide's content. Include the verse text and reference in the specified Bible version.

        2. Ensure the content is:
        - Relevant to the topic, theme, and scripture context.
        - Faith-based and rooted in Christian teachings.
        - Easy to understand for a general Christian audience.

        3. Avoid:
        - Non-Christian references or interpretations.
        - Secular or out-of-context content.
        - Fictional Bible verses.

        ### Example JSON Output:
        {
        "title": "Trusting God in Difficult Times",
        "content": [
            "Trusting God means surrendering control and believing in His plan.",
            "Proverbs 3:5-6 reminds us to 'Trust in the Lord with all thine heart...'",
            "Real-life example: Job’s unwavering faith during trials."
        ],
        "relevant_scripture": [
            {
            "reference": "Proverbs 3:5-6",
            "text": "Trust in the Lord with all thine heart; and lean not unto thine own understanding."
            },
            {
            "reference": "Job 1:21",
            "text": "The Lord gave, and the Lord hath taken away; blessed be the name of the Lord."
            }
        ]
        }
        `;

    console.log(`Prompt ${prompt}`)
    
    const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
            { role: "system", 
              
            content: `
            You are an AI presentation generator designed to create Christian-themed PowerPoint presentations for pastors, worship leaders, and faith-based educators. Your job is to generate a presentation title, and slide titles and descriptions that are deeply rooted in faith, scripture, and Christian teachings. Your output must adhere to the following guidelines:
            
            Faith and Christian Context Only:
            - Ensure that all content reflects Biblical principles, Christian beliefs, and teachings from the Bible.
            - Avoid any secular, controversial, or out-of-context interpretations.
            - Focus on inspiration, faith-building, and themes relevant to the Christian audience.
            
            Structure of Output:
            - Presentation Title: Provide an overarching title that summarizes the presentation’s main focus (e.g., The Power of Faith, Walking in God’s Grace).
            - Slides: Generate a title and a detailed description for each slide. The number of slides and other details will be specified by the user.
            
            Slide Content:
            - Title: Summarize the key message of the slide in a concise and engaging manner.
            - Description: Provide a detailed explanation, scripture references, and examples of real-life applications. Include:
                - Key Bible verses (use the specified Bible version, e.g., King James Version).
                - Stories or parables from the Bible related to the topic.
                - Practical life applications for churchgoers or ministry leaders.
            
            Language and Tone:
            - Use an encouraging, uplifting, and respectful tone.
            - Avoid overly academic language; instead, ensure that the content is easy to understand for a general Christian audience.
            - Use proper theological terms but explain them clearly when necessary.
            
            Limitations and Avoidance:
            - Avoid non-Christian religious references, political content, or modern secular interpretations.
            - Do not add fictional Bible verses or make assumptions that are not supported by scripture.
            
            Bible Versions:
            - Always use the Bible version specified by the user (e.g., KJV, NIV, ESV). If unspecified, default to King James Version (KJV).
            
            Final Presentation:
            - Ensure each slide contributes to a cohesive and meaningful presentation.
            - Use bullet points for key points, scripture references for deeper insights, and examples for practical application.
          `,
            
            },
            { role: "user", content: prompt }
        ],
        temperature: 0.7
    });

    console.log(`Response ${response.choices[0].message.content}`)
    
    return JSON.parse(response.choices[0].message.content);
}

exports.handler = async (event, context) => {
    try {
        const body = JSON.parse(event.body);
        const { topic, slideCount, bibleVersion, theme } = body;
        console.log(`Event Parameters ${topic} - ${slideCount} - ${bibleVersion} - ${theme}`)
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
        console.log(`Generated Slides ${slides}`)
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