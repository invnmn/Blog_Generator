import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import ReactQuill from "react-quill";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";
import "react-quill/dist/quill.snow.css";

function BlogGenerator() {
  const navigate = useNavigate();
  const { topicId } = useParams();
  const userId = localStorage.getItem("userId");
  const [topic, setTopic] = useState("");
  const [section, setSection] = useState("TITLE");
  const [content, setContent] = useState({ TITLE: "", INTRODUCTION: "", BODY: "" });
  const [editorContent, setEditorContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

  useEffect(() => {
    if (userId && topicId) {
      fetchBlogContent();
    }
  }, [userId, topicId]);

  useEffect(() => {
    setEditorContent(content[section] || "");
  }, [section, content]);

  const fetchBlogContent = async () => {
    try {
      const response = await axios.get(`${API_URL}/get_blog?user_id=${userId}&topic_id=${topicId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
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
    if (!topic) {
      toast.error("Please enter a blog topic");
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(
        `${API_URL}/generate`,
        { user_id: userId, topic_id: topicId, topic, section },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      setContent((prev) => ({ ...prev, [section]: response.data[section.toLowerCase()] }));
      toast.success("Content generated successfully!");
    } catch (error) {
      toast.error("Failed to generate content");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await axios.post(
        `${API_URL}/save_blog`,
        { user_id: userId, topic_id: topicId, blog_title: topic, section, content: editorContent },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      setContent((prev) => ({ ...prev, [section]: editorContent }));
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
        <h2 className="text-2xl font-semibold text-gray-900">AI Blog Generator</h2>
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
          className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
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
            className="flex-1 py-2 px-4 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            Save Blog
          </button>
          <button
            onClick={() => navigate(`/editor/${topicId}`)}
            className="flex-1 py-2 px-4 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

export default BlogGenerator;