// App.tsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useState } from "react";
import Navbar from "./components/Navbar";
import Login from "./components/Login";
import TopicManager from "./components/TopicManager";
import WebpageEditor from "./components/WebpageEditor";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem("token"));

  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <Navbar isAuthenticated={isAuthenticated} setIsAuthenticated={setIsAuthenticated} />
        <div className="py-6">
          <Routes>
            <Route path="/login" element={<Login setIsAuthenticated={setIsAuthenticated} />} />
            <Route path="/" element={isAuthenticated ? <TopicManager /> : <Login setIsAuthenticated={setIsAuthenticated} />} />
            <Route path="/editor/:topicId" element={<WebpageEditor />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;