import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import ReactQuill from "react-quill";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";
import "react-quill/dist/quill.snow.css";

function BlogGenerator() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState("");
  const [topic, setTopic] = useState("");
  const [section, setSection] = useState("TITLE");
  const [content, setContent] = useState({ TITLE: "", INTRODUCTION: "", BODY: "" });
  const [editorContent, setEditorContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    if (userId) {
      fetchBlogContent();
    }
  }, [userId]);

  useEffect(() => {
    setEditorContent(content[section] || "");
  }, [section, content]);

  const fetchBlogContent = async () => {
    try {
      const response = await axios.get(`${API_URL}/get_blog?user_id=${userId}`);
      if (response.data.blog_title) {
        setTopic(response.data.blog_title);
        setContent({
          TITLE: response.data.title || "",
          INTRODUCTION: response.data.intro || "",
          BODY: response.data.body || "",
        });
      }
    } catch (error) {
      toast.error("Failed to fetch blog content");
    }
  };

  const handleGenerate = async () => {
    if (!userId || !topic) {
      toast.error("Please enter User ID and Blog Topic");
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(`${API_URL}/generate`, {
        user_id: userId,
        topic,
        section,
      });
      setContent(prev => ({ ...prev, [section]: response.data[section.toLowerCase()] }));
      toast.success("Content generated successfully!");
    } catch (error) {
      toast.error("Failed to generate content");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!userId) {
      toast.error("Please enter a User ID before saving");
      return;
    }

    setIsLoading(true);
    try {
      await axios.post(`${API_URL}/save_blog`, {
        user_id: userId,
        blog_title: topic,
        section,
        content: editorContent,
      });
      setContent(prev => ({ ...prev, [section]: editorContent }));
      toast.success("Blog saved successfully!");
    } catch (error) {
      toast.error("Failed to save blog");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-semibold text-gray-900">AI Blog Generator</h2>
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="Enter User ID"
            className="px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Enter blog topic"
          className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <select
          value={section}
          onChange={(e) => setSection(e.target.value)}
          className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="TITLE">Title</option>
          <option value="INTRODUCTION">Introduction</option>
          <option value="BODY">Body</option>
        </select>

        <button
          onClick={handleGenerate}
          disabled={isLoading}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 flex items-center justify-center"
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin mr-2 h-4 w-4" />
              Generating...
            </>
          ) : (
            "Generate Content"
          )}
        </button>

        <div className="space-y-2">
          <h3 className="text-lg font-medium text-gray-900">Editing: {section}</h3>
          <div className="border rounded-md">
            <ReactQuill theme="snow" value={editorContent} onChange={setEditorContent} />
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="flex-1 py-2 px-4 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
          >
            Save Blog
          </button>
          <button
            onClick={() => navigate(`/editor?user_id=${userId}`)}
            className="flex-1 py-2 px-4 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

export default BlogGenerator;