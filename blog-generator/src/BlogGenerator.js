import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css"; // Import styles for the editor

function BlogGenerator() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState("");
  const [topic, setTopic] = useState("");
  const [section, setSection] = useState("TITLE");
  const [additionalPrompt, setAdditionalPrompt] = useState("");
  const [content, setContent] = useState({ TITLE: "", INTRODUCTION: "", BODY: "" });
  const [editorContent, setEditorContent] = useState("");
  const API_URL = process.env.REACT_APP_API_URL;
  console.log("API Base URL:", API_URL);
  // **Fetch Blog Content from Database**
  useEffect(() => {
    if (userId) {
      axios.get(`${API_URL}/get_blog?user_id=${userId}`)
        .then(response => {
          if (response.data.blog_title) {
            setTopic(response.data.blog_title);
            setContent({
              TITLE: response.data.title|| "",
              INTRODUCTION: response.data.intro || "",
              BODY: response.data.body || "",
            });
          }
        })
        .catch(error => console.error("Error fetching blog:", error));
    }
  }, [userId, API_URL]);

  // **Update editor content when section changes**
  useEffect(() => {
    setEditorContent(content[section] || "");
  }, [section, content]);

  // **Generate AI Content**
  const handleGenerate = async () => {
    if (!userId || !topic) {
      alert("Please enter User ID and Blog Topic");
      return;
    }

    const response = await axios.post(`${API_URL}/generate`, {
      user_id: userId,
      topic,
      section,
      additionalPrompt,
    });

    setContent(prev => ({ ...prev, [section]: response.data[section.toLowerCase()] }));
  };

  // **Save Edited Blog Content**
  const handleSave = async () => {
    if (!userId) {
      alert("Please enter a User ID before saving.");
      return;
    }

    try {
      await axios.post(`${API_URL}/save_blog`, {
        user_id: userId,
        blog_title: topic,
        section: section, // TITLE, INTRODUCTION, BODY
        content: editorContent,
      });

      setContent(prev => ({ ...prev, [section]: editorContent }));
      alert("Blog saved successfully!");
    } catch (error) {
      console.error("Error saving blog:", error);
      alert("Failed to save blog.");
    }
  };

  return (
    <div style={{ maxWidth: "800px", margin: "auto", padding: "20px" }}>
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

      <input
        type="text"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder="Enter blog topic"
        style={{ width: "100%", padding: "10px", marginBottom: "10px" }}
      />

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

      <h3>Editing: {section}</h3>
      <ReactQuill theme="snow" value={editorContent} onChange={setEditorContent} />

      <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
        <button onClick={handleSave} style={{ padding: "10px", flex: 1 }}>
          Save Blog
        </button>
        <button onClick={() => navigate(`/editor?user_id=${userId}`)} style={{ padding: "10px", flex: 1 }}>
          Next
        </button>
      </div>
    </div>
  );
}

export default BlogGenerator;

// import { useState, useEffect } from "react";
// import { useNavigate } from "react-router-dom";
// import axios from "axios";
// import ReactQuill from "react-quill";
// import "react-quill/dist/quill.snow.css"; // Import styles for the editor

// function BlogGenerator() {
//   const navigate = useNavigate();
//   const [userId, setUserId] = useState("");
//   const [topic, setTopic] = useState("");
//   const [section, setSection] = useState("TITLE");
//   const [additionalPrompt, setAdditionalPrompt] = useState("");
//   const [content, setContent] = useState({ TITLE: "", INTRODUCTION: "", BODY: "" });
//   const [editorContent, setEditorContent] = useState("");
//   const API_URL = process.env.REACT_APP_API_URL;
//   console.log("API Base URL:", API_URL);
//   // **Fetch Blog Content from Database**
//   useEffect(() => {
//     if (userId) {
//       axios.get(`${API_URL}/get_blog?user_id=${userId}`)
//         .then(response => {
//           if (response.data.blog_title) {
//             setTopic(response.data.blog_title);
//             setContent({
//               TITLE: response.data.title|| "",
//               INTRODUCTION: response.data.intro || "",
//               BODY: response.data.body || "",
//             });
//           }
//         })
//         .catch(error => console.error("Error fetching blog:", error));
//     }
//   }, [userId, API_URL]);

//   // **Update editor content when section changes**
//   useEffect(() => {
//     setEditorContent(content[section] || "");
//   }, [section, content]);

//   // **Generate AI Content**
//   const handleGenerate = async () => {
//     if (!userId || !topic) {
//       alert("Please enter User ID and Blog Topic");
//       return;
//     }

//     const response = await axios.post(`${API_URL}/generate`, {
//       user_id: userId,
//       topic,
//       section,
//       additionalPrompt,
//     });

//     setContent(prev => ({ ...prev, [section]: response.data[section.toLowerCase()] }));
//   };

//   // **Save Edited Blog Content**
//   const handleSave = async () => {
//     if (!userId) {
//       alert("Please enter a User ID before saving.");
//       return;
//     }

//     try {
//       await axios.post(`${API_URL}/save_blog`, {
//         user_id: userId,
//         blog_title: topic,
//         section: section, // TITLE, INTRODUCTION, BODY
//         content: editorContent,
//       });

//       setContent(prev => ({ ...prev, [section]: editorContent }));
//       alert("Blog saved successfully!");
//     } catch (error) {
//       console.error("Error saving blog:", error);
//       alert("Failed to save blog.");
//     }
//   };

//   return (
//     <div style={{ maxWidth: "800px", margin: "auto", padding: "20px" }}>
//       <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
//         <h2>AI Blog Generator</h2>
//         <input
//           type="text"
//           value={userId}
//           onChange={(e) => setUserId(e.target.value)}
//           placeholder="Enter User ID"
//           style={{ padding: "10px", width: "200px", textAlign: "right" }}
//         />
//       </div>

//       <input
//         type="text"
//         value={topic}
//         onChange={(e) => setTopic(e.target.value)}
//         placeholder="Enter blog topic"
//         style={{ width: "100%", padding: "10px", marginBottom: "10px" }}
//       />

//       <select
//         value={section}
//         onChange={(e) => setSection(e.target.value)}
//         style={{ width: "100%", padding: "10px", marginBottom: "10px" }}
//       >
//         <option value="TITLE">Title</option>
//         <option value="INTRODUCTION">Introduction</option>
//         <option value="BODY">Body</option>
//       </select>

//       <button onClick={handleGenerate} style={{ padding: "10px", width: "100%" }}>
//         Generate Content
//       </button>

//       <h3>Editing: {section}</h3>
//       <ReactQuill theme="snow" value={editorContent} onChange={setEditorContent} />

//       <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
//         <button onClick={handleSave} style={{ padding: "10px", flex: 1 }}>
//           Save Blog
//         </button>
//         <button onClick={() => navigate(`/editor?user_id=${userId}`)} style={{ padding: "10px", flex: 1 }}>
//           Next
//         </button>
//       </div>
//     </div>
//   );
// }

// export default BlogGenerator;
