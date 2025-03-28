from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import json
import boto3
import base64
import os
import random
from flask import send_from_directory
from botocore.exceptions import NoCredentialsError

app = Flask(__name__)
CORS(app)
REGION = "us-east-1"
client = boto3.client("bedrock-runtime", region_name=REGION)
claude_model_id = "anthropic.claude-3-haiku-20240307-v1:0"
image_model_id = "amazon.nova-canvas-v1:0"
AWS_BUCKET_NAME = "webbucket.new"

# Initialize SQLite Database
def init_db():
    conn = sqlite3.connect('blog_content.db')
    cursor = conn.cursor()
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS blogs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT UNIQUE,
        blog_title TEXT,
        TITLE TEXT,
        INTRODUCTION TEXT,
        BODY TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')
    conn.commit()
    conn.close()

def get_from_db(user_id=None):
    """Retrieve blog content from SQLite by user_id."""
    conn = sqlite3.connect('blog_content.db')
    cursor = conn.cursor()

    if not user_id:
        conn.close()
        return None

    cursor.execute('''
        SELECT blog_title, TITLE, INTRODUCTION, BODY 
        FROM blogs 
        WHERE user_id = ?
    ''', (user_id,))

    result = cursor.fetchone()
    conn.close()

    if result:
        return {
            "blog_title": result[0],
            "TITLE": result[1] if result[1] else "",
            "INTRODUCTION": result[2] if result[2] else "",
            "BODY": result[3] if result[3] else "",
        }
    return {}



init_db()

# Function to invoke Claude AI
def invoke_claude(prompt):
    try:
        response = client.invoke_model(
            modelId=claude_model_id, 
            body=json.dumps({
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 3000,
                "temperature": 0.5,
                "messages": [{"role": "user", "content": [{"type": "text", "text": prompt}]}]
            })
        )
        model_response = json.loads(response["body"].read())
        return model_response["content"][0]["text"]
    except Exception as e:
        return str(e)

# API to Generate Blog Content
@app.route('/api/generate', methods=['POST'])
def generate_blog():
    data = request.json
    user_id = data.get('user_id')
    topic = data.get('topic')
    print("TOPIC", topic)
    section = data.get('section')
    print("SECTION", section)
    additional_prompt = data.get('additionalPrompt', '')

    if not user_id:
        return jsonify({"error": "User ID is required"}), 400

    prompts = {
        "TITLE": f"""\n\nSystem: You are title generating bot which is SEO optimized for a blog.Only output content
                 \n\nHuman:"You have to write a short one-liner title for {topic}.***Only content to be generated***.{additional_prompt}
                 """,
        "INTRODUCTION": f"""\n\nSystem: You are a content generating bot which only generates SEO optimized Introduction.You can use html and css for better visual inside <div class="introduction"><!-- introduction content with html tags goes here --></div>).**Only content to be generated**.
                            Human:You have  to write an engaging introduction paragraph for a blog post about {topic}.{additional_prompt}
                            
                    """,
        "BODY": f"""\n\nSystem: You are a content-generating bot that strictly follows instructions. Your task is to generate only the **body content** of a blog post without a **TITLE** and **INTRODUCTION** for the topic {topic}.  

                    - Your response **must only** contain HTML content.  
                    - Wrap the content inside:
                    <div class="body">
                        <!-- body content with html tags goes here -->
                    </div>
                    
                {additional_prompt}
            """
    }


    content = invoke_claude(prompts.get(section, ""))
    print("PROMPT",prompts.get(section, ""))
    if not content:
        return jsonify({"error": "Failed to generate content"}), 500
    print("BLOGCONTENT",content)
    # save_to_db(user_id, topic, section, content)
    
    return jsonify({section.lower(): content})

# Function to save content to SQLite
@app.route('/api/save_blog', methods=['POST'])
def save_blog():
    data = request.json
    user_id = data.get("user_id")
    blog_title = data.get("blog_title")
    section = data.get("section")  # TITLE, INTRODUCTION, BODY
    content = data.get("content")

    if not user_id or not blog_title or not section or not content:
        return jsonify({"error": "Missing required fields"}), 400

    conn = sqlite3.connect('blog_content.db')
    cursor = conn.cursor()

    # Check if the blog entry exists
    cursor.execute("SELECT id FROM blogs WHERE user_id = ?", (user_id,))
    existing_id = cursor.fetchone()

    if existing_id:
        # Update existing entry
        cursor.execute(f"UPDATE blogs SET {section} = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?", (content, user_id))
    else:
        # Insert new entry
        cursor.execute(f"INSERT INTO blogs (user_id, blog_title, {section}, created_at, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
                       (user_id, blog_title, content))
    
    conn.commit()
    conn.close()

    return jsonify({"message": "Blog content saved successfully!"})


# API to Retrieve Blog Content by User ID
@app.route('/api/get_blog', methods=['GET'])
def get_blog():
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({"error": "User ID is required"}), 400

    conn = sqlite3.connect('blog_content.db')
    cursor = conn.cursor()
    cursor.execute("SELECT blog_title, TITLE, INTRODUCTION, BODY FROM blogs WHERE user_id = ?", (user_id,))
    result = cursor.fetchone()
    conn.close()
    print("RESULT",result)
    if result:
        return jsonify({
            "blog_title": result[0],
            "title": result[1] or "",
            "intro": result[2] or "",
            "body": result[3] or "",
        })
    return jsonify({"error": "No blog found"}), 404


@app.route('/api/generate_template', methods=['POST'])
def generate_template():
    """Generate an AI-powered HTML template using AWS Bedrock, then replace placeholders."""
    data = request.json
    user_id = data.get("user_id")
    additional_prompt = data.get("additional_prompt", "")

    if not user_id:
        return jsonify({"error": "User ID is required"}), 400

    # Fetch blog content from database
    blog_data = get_from_db(user_id=user_id)

    if not blog_data:
        return jsonify({"error": "No blog found for this user"}), 404

    # Step 1: Generate HTML template with placeholders
    prompt = """System: Generate a professional blog webpage template using only HTML and CSS that resembles popular platforms like Medium or LinkedIn articles. The template should include the following placeholders which will be used for adding division blocks:
                    1. {{TITLE}}
                    2. {{INTRODUCTION}}
                    3. {{BODY}}

                Design requirements:
                - Clean typography with proper spacing and line height for readability.
                - Proper visual hierarchy to guide readers through the content.
                - Should be a visually appealing webpage

                Additional elements to include:
                - Author bio section with avatar placeholder (use {{AVATAR}}, {{AUTHOR_NAME}}, {{AUTHOR_BIO}})
                - Estimated reading time with placeholder (use {{READING_TIME}})

                Use only HTML and CSS (no JavaScript).

                IMPORTANT: Your response should ONLY contain the complete HTML and CSS code. Any explanations, descriptions, or additional information must be included as HTML comments using the format: <!-- Additional information from the model: explanation here -->
                                                        """ + f"Human:{additional_prompt}" + "Assistant:Webpage code"

    raw_template = invoke_claude(prompt)
    print("RAWTEMPLATE",raw_template)
    if not raw_template:
        return jsonify({"error": "Failed to generate template"}), 500

    # Step 2: Replace placeholders with actual blog content
    filled_template = (
        raw_template.replace("{{TITLE}}", blog_data["TITLE"])
                    .replace("{{INTRODUCTION}}", blog_data["INTRODUCTION"])
                    .replace("{{BODY}}", blog_data["BODY"])
    )
    print("html",filled_template)
    return jsonify({"html": filled_template})

@app.route('/api/generate_image', methods=['POST'])
def generate_image():
    """Generate an image using AWS Bedrock based on user prompt."""
    data = request.json
    img_prompt = data.get("prompt", "")

    if not img_prompt:
        return jsonify({"error": "Prompt is required"}), 400

    seed = random.randint(0, 858993460)

    native_request = {
        "taskType": "TEXT_IMAGE",
        "textToImageParams": {"text": img_prompt},
        "imageGenerationConfig": {
            "seed": seed,
            "quality": "standard",
            "height": 400,
            "width": 800,
            "numberOfImages": 1,
        },
    }

    try:
        response = client.invoke_model(modelId=image_model_id, body=json.dumps(native_request))
        model_response = json.loads(response["body"].read())
        base64_image_data = model_response["images"][0]

        output_dir = "output"
        os.makedirs(output_dir, exist_ok=True)

        image_path = os.path.join(output_dir, f"generated_image_{seed}.png")
        with open(image_path, "wb") as file:
            file.write(base64.b64decode(base64_image_data))

        print(f"The generated image has been saved to {image_path}")
        return jsonify({"image_url": f"http://localhost:5000/static/{os.path.basename(image_path)}"})
    except (ClientError, Exception) as e:
        print(f"ERROR: Can't generate image. Reason: {e}")
        return jsonify({"error": "Image generation failed"}), 500

@app.route('/api/static/<filename>')
def serve_image(filename):
    """Serve generated images from output folder."""
    return send_from_directory("output", filename)

# **Initialize S3 Client**
s3 = boto3.client(
    "s3",region_name=REGION
    # aws_access_key_id=AWS_ACCESS_KEY,
    # aws_secret_access_key=AWS_SECRET_KEY
)

# **Route to Upload HTML to S3**
@app.route('/api/upload_to_s3', methods=['POST'])
def upload_to_s3():
    try:
        data = request.json
        user_id = data.get("user_id")
        html_content = data.get("html_content")

        if not user_id or not html_content:
            return jsonify({"error": "Missing user_id or HTML content"}), 400

        # **Generate unique filename**
        file_key = f"webpages/{user_id}.html"
        print("file_key", file_key)
        # **Upload HTML file to S3**
        deo = s3.put_object(Bucket=AWS_BUCKET_NAME, Body=html_content, Key= file_key,ContentType="text/html")
        print(deo)
        # **Generate S3 URL**
        s3_url = f"https://s3.{REGION}.amazonaws.com/{AWS_BUCKET_NAME}/{file_key}"
                  
        return jsonify({"s3_url": s3_url})

    except NoCredentialsError:
        return jsonify({"error": "AWS Credentials not found"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True)



# from flask import Flask, request, jsonify
# from flask_cors import CORS
# import sqlite3
# import json
# import boto3

# app = Flask(__name__)
# CORS(app)

# client = boto3.client("bedrock-runtime", region_name="us-east-1")
# claude_model_id = "anthropic.claude-3-haiku-20240307-v1:0"

# # Initialize DB
# def init_db():
#     conn = sqlite3.connect('blog_content.db')
#     cursor = conn.cursor()
#     cursor.execute('''
#     CREATE TABLE IF NOT EXISTS blogs (
#         id INTEGER PRIMARY KEY AUTOINCREMENT,
#         topic TEXT,
#         title TEXT,
#         intro TEXT,
#         body TEXT,
#         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
#         updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
#     )''')
#     conn.commit()
#     conn.close()

# init_db()

# # Function to invoke Claude AI
# def invoke_claude(prompt):
#     try:
#         response = client.invoke_model(
#             modelId=claude_model_id, 
#             body=json.dumps({
#                 "anthropic_version": "bedrock-2023-05-31",
#                 "max_tokens": 500,
#                 "temperature": 0.5,
#                 "messages": [{"role": "user", "content": [{"type": "text", "text": prompt}]}]
#             })
#         )
#         model_response = json.loads(response["body"].read())
#         return model_response["content"][0]["text"]
#     except Exception as e:
#         return str(e)

# # API to Generate Blog Content
# @app.route('/api/generate', methods=['POST'])
# def generate_blog():
#     data = request.json
#     topic = data.get('topic')
#     section = data.get('section')
#     additional_prompt = data.get('additionalPrompt', '')

#     prompts = {
#         "TITLE": f"""\n\nSystem: You are title generating bot which is SEO optimized for a blog.Only output content
#                  \n\nHuman:"You have to write a short one-liner title for {topic}.***Only content to be generated***.{additional_prompt}
#                  """,
#         "INTRODUCTION": f"""\n\nSystem: You are a content generating bot which only generates SEO optimized Introduction.You can use html and css for better visual inside <div class="introduction"><!-- introduction content with html tags goes here --></div>).**Only content to be generated**.
#                             Human:You have  to write an engaging introduction paragraph for a blog post about {topic}.{additional_prompt}
                            
#                     """,
#         "BODY": f"""\n\nSystem: You are a content-generating bot that strictly follows instructions. Your task is to generate only the **body content** of a blog post without a **TITLE** and **INTRODUCTION** for the topic {topic}.  

#                     - Your response **must only** contain HTML content.  
#                     - Wrap the content inside:
#                     <div class="body">
#                         <!-- body content with html tags goes here -->
#                     </div>
                    
#                 {additional_prompt}
#             """
#     }

#     results = {}
#     if section == "ALL":
#         for sec, prompt in prompts.items():
#             print(f"{sec}CCCCCCCCCCCCCCCCCCCCCCC{prompt}")
#             results[sec.lower()] = invoke_claude(prompt)
#     else:
#         results[section.lower()] = invoke_claude(prompts[section])
#     print(results)
#     return jsonify(results)

# # API to Save Edited Content
# @app.route('/api/save', methods=['POST'])
# def save_blog():
#     data = request.json
#     topic = data["topic"]
#     content = data["content"]

#     conn = sqlite3.connect('blog_content.db')
#     cursor = conn.cursor()

#     cursor.execute('''
#     INSERT INTO blogs (topic, title, intro, body, updated_at)
#     VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
#     ON CONFLICT(id) DO UPDATE 
#     SET title=excluded.title, intro=excluded.intro, body=excluded.body, updated_at=CURRENT_TIMESTAMP
#     ''', (topic, content["title"], content["introduction"], content["body"]))

#     conn.commit()
#     conn.close()
#     return jsonify({"message": "Blog saved successfully!"})

# if __name__ == '__main__':
#     app.run(debug=True)




# from flask import Flask, request, jsonify
# from flask_cors import CORS
# import sqlite3
# import json
# import boto3

# app = Flask(__name__)
# CORS(app)

# # AWS Bedrock Client
# client = boto3.client("bedrock-runtime", region_name="us-east-1")
# claude_model_id = "anthropic.claude-3-haiku-20240307-v1:0"

# # Initialize DB
# def init_db():
#     conn = sqlite3.connect('blog_content.db')
#     cursor = conn.cursor()
#     cursor.execute('''
#     CREATE TABLE IF NOT EXISTS blogs (
#         id INTEGER PRIMARY KEY AUTOINCREMENT,
#         user_id TEXT UNIQUE,
#         blog_title TEXT,
#         TITLE TEXT,
#         INTRODUCTION TEXT,
#         BODY TEXT,
#         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
#         updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
#     )''')
#     conn.commit()
#     conn.close()

# init_db()

# # Function to invoke Claude model
# def invoke_claude(prompt):
#     try:
#         response = client.invoke_model(
#             modelId=claude_model_id, 
#             body=json.dumps({
#                 "anthropic_version": "bedrock-2023-05-31",
#                 "max_tokens": 500,
#                 "temperature": 0.5,
#                 "messages": [{"role": "user", "content": [{"type": "text", "text": prompt}]}]
#             })
#         )
#         model_response = json.loads(response["body"].read())
#         return model_response["content"][0]["text"]
#     except Exception as e:
#         return str(e)

# # Generate blog content
# @app.route('/api/generate', methods=['POST'])
# def generate_blog():
#     data = request.json
#     topic = data.get('topic')
#     section = data.get('section')
#     additional_prompt = data.get('additionalPrompt', '')

#     prompts = {
#         "TITLE": f"""\n\nSystem: You are title generating bot which is SEO optimized for a blog.Only output content
#                  \n\nHuman:"You have to write a short one-liner title for {topic}.***Only content to be generated**.{additional_prompt}
#                  """,
#         "INTRODUCTION": f"""\n\nSystem: You are a content generating bot which only generates SEO optimized Introduction.You can use html and css for better visual inside <div class="introduction"><!-- introduction content with html tags goes here --></div>).**Only content to be generated**.
#                             Human:You have  to write an engaging introduction paragraph for a blog post about {topic}.{additional_prompt}
                            
#                     """,
#         "BODY": f"""\n\nSystem: You are a content-generating bot that strictly follows instructions. Your task is to generate only the **body content** of a blog post without a **TITLE** and **INTRODUCTION** for the topic {topic}.  

#                     - Your response **must only** contain HTML content.  
#                     - Wrap the content inside:
#                     <div class="body">
#                         <!-- body content with html tags goes here -->
#                     </div>
                    
#                 {additional_prompt}
#             """
#     }

#     results = {}
#     if section == "ALL":
#         for sec, prompt in prompts.items():
#             print(f"{sec}AAAAAAAAAAA{prompt}")
#             results[sec.lower()] = invoke_claude(prompt)
#     else:
#         results[section.lower()] = invoke_claude(prompts[section])
#     print(results)
#     return jsonify(results)

# if __name__ == '__main__':
#     app.run(debug=True)
