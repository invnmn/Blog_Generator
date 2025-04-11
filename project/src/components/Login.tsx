import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";

interface LoginProps {
  setIsAuthenticated: (value: boolean) => void;
}

function Login({ setIsAuthenticated }: LoginProps) {
  const [isSignUp, setIsSignUp] = useState(false); // Toggle between login and sign-up
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

  const handleLogin = async () => {
    if (!username || !password) {
      toast.error("Please enter username and password");
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(`${API_URL}/login`, { username, password });
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("userId", response.data.user_id);
      setIsAuthenticated(true);
      toast.success("Logged in successfully!");
    } catch (error) {
      toast.error("Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!username || !password) {
      toast.error("Please enter username and password");
      return;
    }

    setIsLoading(true);
    try {
      await axios.post(`${API_URL}/register`, { username, password });
      toast.success("Account created successfully! Please log in.");
      setIsSignUp(false); // Switch back to login form after successful sign-up
      setUsername("");
      setPassword("");
    } catch (error) {
      toast.error("Sign-up failed. Username may already exist.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSignUp) {
      handleSignUp();
    } else {
      handleLogin();
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-sm space-y-6">
      <h2 className="text-2xl font-semibold text-gray-900">{isSignUp ? "Sign Up" : "Login"}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
          className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
        >
          {isLoading ? (
            <Loader2 className="animate-spin h-4 w-4 mr-2" />
          ) : isSignUp ? (
            "Sign Up"
          ) : (
            "Login"
          )}
        </button>
      </form>
      <div className="text-center">
        <p className="text-gray-600">
          {isSignUp ? "Already have an account?" : "Don't have an account?"}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="ml-1 text-blue-600 hover:underline focus:outline-none"
          >
            {isSignUp ? "Login" : "Sign Up"}
          </button>
        </p>
      </div>
    </div>
  );
}

export default Login;

// import { useState } from "react";
// import axios from "axios";
// import toast from "react-hot-toast";
// import { Loader2 } from "lucide-react";

// interface LoginProps {
//   setIsAuthenticated: (value: boolean) => void;
// }

// function Login({ setIsAuthenticated }: LoginProps) {
//   const [username, setUsername] = useState("");
//   const [password, setPassword] = useState("");
//   const [isLoading, setIsLoading] = useState(false);
//   const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

//   const handleLogin = async () => {
//     if (!username || !password) {
//       toast.error("Please enter username and password");
//       return;
//     }

//     setIsLoading(true);
//     try {
//       const response = await axios.post(`${API_URL}/login`, { username, password });
//       localStorage.setItem("token", response.data.token);
//       localStorage.setItem("userId", response.data.user_id);
//       setIsAuthenticated(true);
//       toast.success("Logged in successfully!");
//     } catch (error) {
//       toast.error("Login failed");
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   return (
//     <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-sm space-y-4">
//       <h2 className="text-2xl font-semibold text-gray-900">Login</h2>
//       <input
//         type="text"
//         value={username}
//         onChange={(e) => setUsername(e.target.value)}
//         placeholder="Username"
//         className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//       />
//       <input
//         type="password"
//         value={password}
//         onChange={(e) => setPassword(e.target.value)}
//         placeholder="Password"
//         className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//       />
//       <button
//         onClick={handleLogin}
//         disabled={isLoading}
//         className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
//       >
//         {isLoading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : "Login"}
//       </button>
//     </div>
//   );
// }

// export default Login;