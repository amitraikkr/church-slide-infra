import json
import os
from openai import OpenAI

client = OpenAI(api_key=os.environ['OPENAI_API_KEY'])

def generate_slide_content(topic, slide_number, total_slides, bible_version, theme):
    prompt = f"""Create content for slide {slide_number} of {total_slides} for a presentation with the following details:
    Topic: {topic}
    Bible Version: {bible_version}
    Theme: {theme}
    
    Format the response as a JSON object with:
    - title
    - content (bullet points or paragraphs)
    - relevant_scripture (if applicable)
    """
    
    response = client.chat.completions.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": "You are a helpful assistant creating faith-based presentations."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.7
    )
    
    return json.loads(response.choices[0].message.content)

def lambda_handler(event, context):
    try:
        body = json.loads(event['body'])
        topic = body['topic']
        slide_count = body['slideCount']
        bible_version = body['bibleVersion']
        theme = body['theme']
        
        slides = []
        for i in range(slide_count):
            slide_content = generate_slide_content(
                topic, 
                i + 1, 
                slide_count, 
                bible_version, 
                theme
            )
            slides.append(slide_content)
        
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({
                'slides': slides
            })
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({
                'error': str(e)
            })
        }