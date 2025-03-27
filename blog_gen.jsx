import { useState, useEffect } from "react";
import axios from "axios";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css"; // Import styles for the editor

function BlogGenerator() {
  const [userId, setUserId] = useState(""); // User ID input
  const [topic, setTopic] = useState("");
  const [section, setSection] = useState("TITLE");
  const [additionalPrompt, setAdditionalPrompt] = useState("");
  const [content, setContent] = useState({
    title: "",
    intro: "",
    body: "",
  });
  const [editorContent, setEditorContent] = useState(""); // Editor content

  // Fetch existing blog when User ID is entered
  useEffect(() => {
    if (userId) {
      axios.get(`http://localhost:5000/get_blog?user_id=${userId}`)
        .then(response => {
          if (response.data.blog_title) {
            setTopic(response.data.blog_title);
            setContent({
              title: response.data.title || "",
              intro: response.data.intro || "",
              body: response.data.body || "",
            });
          }
        })
        .catch(error => console.error("Error fetching blog:", error));
    }
  }, [userId]);

  // Update editor content when the section changes
  useEffect(() => {
    if (section === "TITLE") setEditorContent(content.title);
    else if (section === "INTRODUCTION") setEditorContent(content.introduction);
    else if (section === "BODY") setEditorContent(content.body);
  }, [section, content]);

  // Function to generate content
  const handleGenerate = async () => {
    if (!userId || !topic) {
      alert("Please enter User ID and Blog Topic");
      return;
    }

    const response = await axios.post("http://localhost:5000/generate", {
      user_id: userId,
      topic,
      section,
      additionalPrompt,
    });

    setContent(prev => ({ ...prev, [section.toLowerCase()]: response.data[section.toLowerCase()] }));
  };

  // Function to save edited content
  const handleSave = async () => {
    if (!userId) {
      alert("Please enter a User ID before saving.");
      return;
    }

    const updatedContent = { ...content, [section.toLowerCase()]: editorContent };
    setContent(updatedContent);

    await axios.post("http://localhost:5000/generate", {
      user_id: userId,
      topic,
      section,
      additionalPrompt,
    });

    alert("Blog saved successfully!");
  };

  return (
    <div style={{ maxWidth: "800px", margin: "auto", padding: "20px" }}>
      {/* User ID Input at the Top Right */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>AI Blog Generator</h2>
        <input
          type="text"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="Enter User ID"
          style={{ padding: "10px", width: "200px", textAlign: "right" }}
        />
      </div>

      {/* Blog Topic Input */}
      <input
        type="text"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder="Enter blog topics"
        style={{ width: "100%", padding: "10px", marginBottom: "10px" }}
      />

      {/* Section Selector */}
      <select
        value={section}
        onChange={(e) => setSection(e.target.value)}
        style={{ width: "100%", padding: "10px", marginBottom: "10px" }}
      >
        <option value="TITLE">Title</option>
        <option value="INTRODUCTION">Introduction</option>
        <option value="BODY">Body</option>
      </select>

      <button onClick={handleGenerate} style={{ padding: "10px", width: "100%" }}>
        Generate Content
      </button>

      {/* Rich Text Editor */}
      <h3>Editing: {section}</h3>
      <ReactQuill
        theme="snow"
        value={editorContent}
        onChange={setEditorContent}
      />

      <button onClick={handleSave} style={{ padding: "10px", width: "100%", marginTop: "20px" }}>
        Save Blog
      </button>
    </div>
  );
}

export default BlogGenerator;


// import { useState } from 'react';

// function BlogGenerator() {
//   const [topic, setTopic] = useState('');
//   const [section, setSection] = useState('ALL');
//   const [additionalPrompt, setAdditionalPrompt] = useState('');
//   const [content, setContent] = useState({ title: '', intro: '', body: '' });

//   const handleGenerate = async () => {
//     const response = await fetch('http://localhost:5000/generate', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ topic, section, additionalPrompt }),
//     });
//     const data = await response.json();
//     setContent(data);
//   };

//   return (
//     <div>
//       <h2>Blog Generator</h2>
//       <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Enter blog topic" />
//       <select value={section} onChange={(e) => setSection(e.target.value)}>
//         <option value="ALL">All</option>
//         <option value="TITLE">Title</option>
//         <option value="INTRODUCTION">Introduction</option>
//         <option value="BODY">Body</option>
//       </select>
//       <textarea value={additionalPrompt} onChange={(e) => setAdditionalPrompt(e.target.value)} placeholder="Additional prompt" />
//       <button onClick={handleGenerate}>Generate</button>
//       <h3>Generated Content</h3>
//       <p><strong>Title:</strong> {content.title}</p>
//       <p><strong>Introduction:</strong> {content.intro}</p>
//       <p><strong>Body:</strong> {content.body}</p>
//     </div>
//   );
// }

// export default BlogGenerator;
