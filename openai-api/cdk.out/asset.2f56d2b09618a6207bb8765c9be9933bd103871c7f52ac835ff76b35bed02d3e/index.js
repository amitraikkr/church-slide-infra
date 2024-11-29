const OpenAI = require('openai');
const pdf = require('pdf-parse');

// Add fallback and validation for API key
const getOpenAIClient = () => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    return new OpenAI({ apiKey });
};

const client = getOpenAIClient();

// Add this helper function
const cleanAndParseJSON = (content) => {
    try {
        // First try direct parsing
        return JSON.parse(content);
    } catch (error) {
        // Remove markdown code blocks and try again
        const cleanContent = content
            .replace(/```json\n|```\n|```/g, '')  // Remove JSON code block markers
            .trim();  // Remove extra whitespace
        
        try {
            return JSON.parse(cleanContent);
        } catch (secondError) {
            console.error('[ERROR] Failed to parse cleaned content:', {
                originalContent: content,
                cleanedContent: cleanContent,
                error: secondError.message
            });
            throw new Error('Failed to parse response as JSON');
        }
    }
};

// Update PDF processing helper
const extractPDFContent = async (pdfBuffer) => {
    try {
        // Add debug logging
        console.log('[DEBUG] PDF Buffer:', {
            length: pdfBuffer.length,
            isBuffer: Buffer.isBuffer(pdfBuffer),
            firstBytes: pdfBuffer.slice(0, 20).toString('hex')
        });

        // Ensure we have a valid PDF buffer
        if (!Buffer.isBuffer(pdfBuffer) || pdfBuffer.length === 0) {
            throw new Error('Invalid PDF buffer received');
        }

        const data = await pdf(pdfBuffer, {
            max: 0, // unlimited pages
            version: 'v2.0.550'
        });

        return data.text.trim();

    } catch (error) {
        console.error('[ERROR] PDF parsing failed:', {
            error: error.message,
            stack: error.stack,
            details: error.details
        });
        // Return null instead of throwing to allow the process to continue
        return null;
    }
};

// Update form data parsing
const parseMultipartFormData = async (event) => {
    const contentType = event.headers['content-type'] || event.headers['Content-Type'];
    const boundary = contentType.split('boundary=')[1];
    const parts = event.body.split(boundary);
    const formData = new Map();
    let pdfContent = null;

    for (const part of parts) {
        // Handle file upload with improved debugging
        const fileMatch = part.match(/Content-Disposition: form-data; name="([^"]+)"; filename="([^"]+)"\r\nContent-Type: ([^\r\n]+)\r\n\r\n([\s\S]*?)(?:\r\n|$)/);
        if (fileMatch && fileMatch[1] === 'pdf') {
            try {
                console.log('[DEBUG] PDF File Match:', {
                    fieldName: fileMatch[1],
                    fileName: fileMatch[2],
                    contentType: fileMatch[3],
                    contentLength: fileMatch[4].length
                });

                // Handle base64 encoded content
                let fileBuffer;
                if (event.isBase64Encoded) {
                    const base64Content = Buffer.from(fileMatch[4], 'base64');
                    fileBuffer = Buffer.from(base64Content);
                } else {
                    fileBuffer = Buffer.from(fileMatch[4], 'binary');
                }

                console.log('[DEBUG] PDF Buffer:', {
                    length: fileBuffer.length,
                    isBuffer: Buffer.isBuffer(fileBuffer),
                    firstBytes: fileBuffer.slice(0, 20).toString('hex')
                });

                pdfContent = await extractPDFContent(fileBuffer);
                
                console.log('[DEBUG] PDF Content:', {
                    extracted: !!pdfContent,
                    length: pdfContent ? pdfContent.length : 0
                });
            } catch (error) {
                console.error('[ERROR] PDF processing failed:', {
                    error: error.message,
                    stack: error.stack
                });
                // Continue without PDF content
            }
            continue;
        }

        // Handle regular form fields
        const fieldMatch = part.match(/name="([^"]+)"\r\n\r\n([\s\S]*?)(?:\r\n|$)/);
        if (fieldMatch) {
            formData.set(fieldMatch[1], fieldMatch[2].trim());
        }
    }

    // Add debug logging
    console.log('[DEBUG] Parsed form data:', {
        formDataKeys: Array.from(formData.keys()),
        hasPDF: !!pdfContent,
        pdfContentLength: pdfContent ? pdfContent.length : 0
    });

    return { formData, pdfContent };
};

// Update generateSlideContent to handle null PDF content gracefully
async function generateSlideContent(topic, totalSlides, theme, bibleVersion, pdfContent = null) {
    console.log('[INFO] Starting slide generation:', { 
        topic, 
        totalSlides, 
        hasPDF: !!pdfContent,
        pdfContentLength: pdfContent ? pdfContent.length : 0 
    });
    
    const prompt = `
        Create content for ${totalSlides} slides for a presentation. The presentation is based on the following details:
        - **Topic**: ${topic}
        - **Bible Version**: ${bibleVersion}
        - **Theme**: ${theme}
        ${pdfContent ? `\n- **Reference Content**: ${pdfContent.substring(0, 1000)}...\n` : ''}

        ### Instructions:
        1. Format the response as a **valid JSON object** with the following keys:
        - **Slide Number**: The slide number for this slide.
        - **title**: A concise and engaging title for the slide.
        - **Description**: Either bullet points or paragraphs summarizing the key message for this slide.
        - **Theme**: Its a template for the presentation, so the theme should be reflected in the content like Childrens Sermon, Youth Sermon, Christmas Sermon, Easter Sermon, etc.
        - **Reference Content**: If there is reference content, use it to help create the slide, it the content of attached PDF in frontend, so it can be used to create the slide or use as knowledge to create the slide.
       
        2. Ensure the content is:
        - Relevant to the topic or istruction provided through Topic, and scripture context.
        - Faith-based and rooted in Christian teachings.
        - Easy to understand for a general Christian audience.
        - Each slide should be unique and not repeat information from other slides.
        - Each slide should be between 50 and 100 words.
        

        3. Avoid:
        - Non-Christian references or interpretations.
        - Secular or out-of-context content.
        - Fictional Bible verses.

        ### Example JSON Output:
        {
        "title": "Trusting God in Difficult Times",
        "Description": [
            "Trusting God means surrendering control and believing in His plan.",
            "Proverbs 3:5-6 reminds us to 'Trust in the Lord with all thine heart...'",
        ],
        }
    `;

    console.log(`Prompt: ${prompt}`);

    try {
        const response = await client.chat.completions.create({
            model: "gpt-4o-mini",
            max_tokens: 2000,
            messages: [
                {
                    role: "system",
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

        // Add safe parsing
        const parsedResponse = cleanAndParseJSON(response.choices[0].message.content);

        console.log('[INFO] Successfully processed response');
        return parsedResponse;

    } catch (error) {
        console.error('[ERROR] Slide generation failed:', error);
        throw error;
    }
}

// Update validateInput helper
const validateInput = (formData) => {
    const topic = formData.get('topic');
    const slideCount = parseInt(formData.get('slideCount'));
    const bibleVersion = formData.get('bibleVersion');
    const theme = formData.get('theme');
    
    if (!topic || !slideCount || !bibleVersion || !theme) {
        throw new Error('Missing required fields: topic, slideCount, bibleVersion, theme');
    }
    if (slideCount <= 0 || slideCount > 20) {
        throw new Error('slideCount must be between 1 and 20');
    }
    return { topic, slideCount, bibleVersion, theme };
};

exports.handler = async (event, context) => {
    console.log('Request received:', { 
        requestId: context.awsRequestId,
        event: event 
    });

    try {
        const contentType = event.headers['content-type'] || event.headers['Content-Type'];
        if (!contentType || !contentType.includes('multipart/form-data')) {
            throw new Error('Invalid content type. Expected multipart/form-data');
        }

        // Parse form data and PDF content
        const { formData, pdfContent } = await parseMultipartFormData(event);

        // Validate and extract input
        const { topic, slideCount, bibleVersion, theme } = validateInput(formData);

        console.log('Processed form data:', { 
            topic, 
            slideCount, 
            bibleVersion, 
            theme,
            hasPDF: !!pdfContent 
        });

        // Pass PDF content to slide generation
        const slideContent = await generateSlideContent(topic, slideCount, theme, bibleVersion, pdfContent);

        // Transform the slide content for frontend
        const transformedSlides = slideContent.map(slide => ({
            title: slide.title,
            description: slide.Description.join('\n') // Join description array into a single string
        }));

        console.log("Transformed Slides:", transformedSlides);

        console.log('Slide content generated successfully', { 
            requestId: context.awsRequestId,
            slideCount 
        });

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json',
                'x-request-id': context.awsRequestId
            },
            body: JSON.stringify({ 
                slides: transformedSlides,
                requestId: context.awsRequestId 
            })
        };

    } catch (error) {
        console.error('Error processing request:', {
            requestId: context.awsRequestId,
            error: error.message,
            stack: error.stack
        });

        // Improved error response handling
        const statusCode = error.message.includes('Missing') ? 400 : 500;
        
        return {
            statusCode,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json',
                'x-request-id': context.awsRequestId
            },
            body: JSON.stringify({ 
                error: error.message,
                requestId: context.awsRequestId,
                timestamp: new Date().toISOString()
            })
        };
    }
};
