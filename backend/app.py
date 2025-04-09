from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import json
import boto3
import base64
import os
import random
import jwt
from datetime import datetime, timedelta
from botocore.exceptions import NoCredentialsError, ClientError
from botocore.config import Config
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
CORS(app)
REGION = "us-east-1"

try:
    custom_config = Config(connect_timeout=10, read_timeout=600)
    client = boto3.client("bedrock-runtime", region_name=REGION, config=custom_config)
    s3 = boto3.client("s3", region_name=REGION)
except NoCredentialsError:
    print("AWS credentials not found. Please configure your AWS credentials.")
    exit(1)

claude_model_id = "us.anthropic.claude-3-7-sonnet-20250219-v1:0"
image_model_id = "amazon.nova-canvas-v1:0"
AWS_BUCKET_NAME = "webbucket.new"
SECRET_KEY = "your-secret-key"

# Initialize SQLite Database
def init_db():
    conn = sqlite3.connect('blog_content.db')
    cursor = conn.cursor()

    # Users table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
    )''')

    # Topics table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS topics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        title TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )''')

    # Blogs table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS blogs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        topic_id INTEGER,
        blog_title TEXT,
        title TEXT,
        introduction TEXT,
        body TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (topic_id) REFERENCES topics(id)
    )''')

    # Webpages table (store full HTML content)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS webpages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        topic_id INTEGER,
        html_content TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (topic_id) REFERENCES topics(id)
    )''')

    conn.commit()
    conn.close()

init_db()

# Authentication middleware
def token_required(f):
    def decorated(*args, **kwargs):
        token = request.headers.get("Authorization")
        if not token or not token.startswith("Bearer "):
            return jsonify({"error": "Token is missing"}), 401
        try:
            token = token.split(" ")[1]
            payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            request.user_id = payload["user_id"]
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401
        return f(*args, **kwargs)
    decorated.__name__ = f.__name__
    return decorated

# User Registration
@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    username = data.get("username")
    password = data.get("password")
    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400
    conn = sqlite3.connect('blog_content.db')
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO users (username, password) VALUES (?, ?)",
                       (username, generate_password_hash(password)))
        conn.commit()
        return jsonify({"message": "User registered successfully"}), 201
    except sqlite3.IntegrityError:
        return jsonify({"error": "Username already exists"}), 400
    finally:
        conn.close()

# User Login
@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    username = data.get("username")
    password = data.get("password")
    conn = sqlite3.connect('blog_content.db')
    cursor = conn.cursor()
    cursor.execute("SELECT id, password FROM users WHERE username = ?", (username,))
    user = cursor.fetchone()
    conn.close()
    if not user or not check_password_hash(user[1], password):
        return jsonify({"error": "Invalid credentials"}), 401
    token = jwt.encode({"user_id": user[0], "exp": datetime.utcnow() + timedelta(hours=24)},
                       SECRET_KEY, algorithm="HS256")
    return jsonify({"token": token, "user_id": user[0]})

# Topic Management
@app.route('/api/topics', methods=['GET', 'POST'])
@token_required
def manage_topics():
    conn = sqlite3.connect('blog_content.db')
    cursor = conn.cursor()
    if request.method == 'GET':
        user_id = request.args.get("user_id")
        cursor.execute("SELECT id, title FROM topics WHERE user_id = ?", (user_id,))
        topics = [{"id": row[0], "title": row[1]} for row in cursor.fetchall()]
        conn.close()
        return jsonify({"topics": topics})
    if request.method == 'POST':
        data = request.json
        user_id = data.get("user_id")
        title = data.get("title")
        cursor.execute("INSERT INTO topics (user_id, title) VALUES (?, ?)", (user_id, title))
        topic_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return jsonify({"topic_id": topic_id, "message": "Topic created successfully"}), 201

# Function to invoke Claude AI
def invoke_claude(prompt):
    messages = [{"role": "user", "content": [{"text": prompt}]}]
    system_prompts = [{"text": "Try generate the content or code within 4500 tokens"}]
    inference_config = {"maxTokens": 5000, "temperature": 0.5, "topP": 0.9}
    try:
        response = client.converse(
            modelId=claude_model_id,
            messages=messages,
            system=system_prompts,
            inferenceConfig=inference_config,
        )
        return response["output"]["message"]["content"][0]["text"]
    except Exception as e:
        return str(e)

# Generate/Modify Blog Content
@app.route('/api/generate', methods=['POST'])
@token_required
def generate_or_modify_blog():
    data = request.json
    user_id = data.get('user_id')
    topic_id = data.get('topic_id')
    content = data.get('content', '')
    prompt = data.get('prompt')
    print("Received data:", data)
    # if not user_id or not topic_id or not prompt:
    #     return jsonify({"error": "User ID, Topic ID, and prompt are required"}), 400

    # conn = sqlite3.connect('blog_content.db')
    # cursor = conn.cursor()
    # cursor.execute("SELECT title FROM topics WHERE id = ? AND user_id = ?", (topic_id, user_id))
    # topic_row = cursor.fetchone()
    # conn.close()

    # if not topic_row:
    #     return jsonify({"error": "Topic not found"}), 404

    # topic = topic_row[0]
    # print("TOPIC",topic)
    print("CONTENT",content)
    
    # Generate or modify content
    claude_prompt = (
        f"System: You are a content generation/modification bot. "
        f"Generate new content if no original content is provided, or modify the provided content based on the prompt. "
        f"Output only the modified or generated content.\n\n"
        f"Original content: {content if content else 'No content provided'}\n"
        f"Prompt: {prompt}"
    )

    new_content = invoke_claude(claude_prompt)
    print(f"Claude response: {new_content}")
    if not new_content or isinstance(new_content, str) and "error" in new_content.lower():
        return jsonify({"error": "Failed to generate/modify content"}), 500


    return jsonify({'content': new_content})

# Generate Image
@app.route('/api/generate_image', methods=['POST'])
@token_required
def generate_image():
    data = request.json
    img_prompt = data.get("prompt", "")
    print("Received data:", data)
    if not img_prompt:
        return jsonify({"error": "Prompt is required"}), 400

    seed = random.randint(0, 858993460)
    native_request = {
        "taskType": "TEXT_IMAGE",
        "textToImageParams": {"text": img_prompt},
        "imageGenerationConfig": {"seed": seed, "quality": "standard", "height": 400, "width": 800, "numberOfImages": 1},
    }

    try:
        response = client.invoke_model(modelId=image_model_id, body=json.dumps(native_request))
        model_response = json.loads(response["body"].read())
        base64_image_data = model_response["images"][0]

        output_dir = "static/uploads"
        os.makedirs(output_dir, exist_ok=True)
        image_path = os.path.join(output_dir, f"generated_image_{seed}.png")
        with open(image_path, "wb") as file:
            file.write(base64.b64decode(base64_image_data))

        s3_key = f"uploads/generated_image_{seed}.png"
        s3.upload_file(image_path, AWS_BUCKET_NAME, s3_key, ExtraArgs={"ContentType": "image/png"})
        s3_image_url = f"https://s3.{REGION}.amazonaws.com/{AWS_BUCKET_NAME}/{s3_key}"

        return jsonify({"image_url": s3_image_url})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Get Blog Content
@app.route('/api/get_blog', methods=['GET'])
@token_required
def get_blog():
    user_id = request.args.get('user_id')
    topic_id = request.args.get('topic_id')
    print("Received data:", user_id, topic_id)
    if not user_id or not topic_id:
        return jsonify({"error": "User ID and Topic ID are required"}), 400

    conn = sqlite3.connect('blog_content.db')
    cursor = conn.cursor()
    cursor.execute("SELECT blog_title, title, introduction, body FROM blogs WHERE user_id = ? AND topic_id = ?", (user_id, topic_id))
    result = cursor.fetchone()
    conn.close()

    if result:
        return jsonify({
            "blog_title": result[0],
            "title": result[1] or "",
            "intro": result[2] or "",
            "body": result[3] or "",
        })
    return jsonify({"error": "No blog found"}), 404

# Generate Template
@app.route('/api/generate_template', methods=['POST'])
@token_required
def generate_template():
    data = request.json
    user_id = data.get("user_id")
    topic_id = data.get("topic_id")
    additional_prompt = data.get("additional_prompt", "")
    print("Received data:", data)
    if not user_id or not topic_id:
        return jsonify({"error": "User ID and Topic ID are required"}), 400

    prompt = """System: Generate a professional blog webpage template using only HTML and CSS.
                Design requirements:
                - Clean typography with proper spacing and line height for readability.
                - Proper visual hierarchy to guide readers through the content.
                - Should be a visually appealing webpage
                """ + "Additional elements to include:" + """ IMPORTANT: Your response should ONLY contain the complete HTML and CSS code i.e the response generated should start with <html> and end with </html>. Any explanations, descriptions, or additional information must be ignored included as HTML comments using the format: <!-- Additional information from the model: explanation here -->""" + f"\n\nHuman:{additional_prompt}\n\nAssistant:Webpage code"

    filled_template = invoke_claude(prompt)
    print("TEMP_OUTPUT", filled_template)
    return jsonify({"html": filled_template})

# Save Webpage (store in database)
@app.route('/api/save_webpage', methods=['POST'])
@token_required
def save_webpage():
    data = request.json
    user_id = data.get("user_id")
    topic_id = data.get("topic_id")
    html_content = data.get("html_content")
    print("Received data:", data)
    if not all([user_id, topic_id, html_content]):
        return jsonify({"error": "Missing required fields"}), 400

    conn = sqlite3.connect('blog_content.db')
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM webpages WHERE user_id = ? AND topic_id = ?", (user_id, topic_id))
    existing_id = cursor.fetchone()

    if existing_id:
        cursor.execute("UPDATE webpages SET html_content = ? WHERE id = ?", (html_content, existing_id[0]))
    else:
        cursor.execute("INSERT INTO webpages (user_id, topic_id, html_content) VALUES (?, ?, ?)", (user_id, topic_id, html_content))
    conn.commit()
    conn.close()

    return jsonify({"success": True})

# Get Webpage Content
@app.route('/api/get_webpage', methods=['GET'])
@token_required
def get_webpage():
    user_id = request.args.get('user_id')
    topic_id = request.args.get('topic_id')
    if not user_id or not topic_id:
        return jsonify({"error": "User ID and Topic ID are required"}), 400

    conn = sqlite3.connect('blog_content.db')
    cursor = conn.cursor()
    cursor.execute("SELECT html_content FROM webpages WHERE user_id = ? AND topic_id = ?", (user_id, topic_id))
    result = cursor.fetchone()
    print("DB_CONTENT_HTML",result)
    conn.close()

    if result and result[0]:
        return jsonify({"html_content": result[0]})
    return jsonify({"error": "No webpage found"}), 404

# Upload to S3 (for hosting only)
@app.route('/api/upload_to_s3', methods=['POST'])
@token_required
def upload_to_s3():
    data = request.json
    user_id = data.get("user_id")
    topic_id = data.get("topic_id")
    html_content = data.get("html_content")
    print("Received data:", data)
    if not all([user_id, topic_id, html_content]):
        return jsonify({"error": "Missing required fields"}), 400

    s3_key = f"webpages/{user_id}_{topic_id}.html"
    try:
        s3.put_object(Bucket=AWS_BUCKET_NAME, Body=html_content, Key=s3_key, ContentType="text/html")
        s3_url = f"https://s3.{REGION}.amazonaws.com/{AWS_BUCKET_NAME}/{s3_key}"
        return jsonify({"s3_url": s3_url})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)