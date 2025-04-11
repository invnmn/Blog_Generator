// TopicManager.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { Loader2, Plus } from "lucide-react";

function TopicManager() {
  const navigate = useNavigate();
  const [topics, setTopics] = useState<{ id: string; title: string }[]>([]);
  const [newTopic, setNewTopic] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const userId = localStorage.getItem("userId");
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

  useEffect(() => {
    fetchTopics();
  }, []);

  const fetchTopics = async () => {
    try {
      const response = await axios.get(`${API_URL}/topics?user_id=${userId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setTopics(response.data.topics);
    } catch (error) {
      toast.error("Failed to fetch topics");
    }
  };

  const handleCreateTopic = async () => {
    if (!newTopic) {
      toast.error("Please enter a topic title");
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(
        `${API_URL}/topics`,
        { user_id: userId, title: newTopic },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      setTopics([...topics, { id: response.data.topic_id, title: newTopic }]);
      setNewTopic("");
      toast.success("Topic created successfully!");
    } catch (error) {
      toast.error("Failed to create topic");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-2xl font-semibold text-gray-900">Manage Topics</h2>
      <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
        <div className="flex gap-4">
          <input
            type="text"
            value={newTopic}
            onChange={(e) => setNewTopic(e.target.value)}
            placeholder="New topic title"
            className="flex-1 px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleCreateTopic}
            disabled={isLoading}
            className="py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
          >
            {isLoading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            Create
          </button>
        </div>
        <ul className="space-y-2">
          {topics.map((topic) => (
            <li key={topic.id} className="flex justify-between items-center p-2 bg-gray-50 rounded-md">
              <span>{topic.title}</span>
              <button
                onClick={() => navigate(`/editor/${topic.id}`)} // Updated to navigate to WebpageEditor
                className="px-4 py-1 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Edit Blog
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default TopicManager;