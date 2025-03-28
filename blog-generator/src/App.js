import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import BlogGenerator from "./BlogGenerator";
import WebpageEditor from "./WebpageEditor";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<BlogGenerator />} />
        <Route path="/editor" element={<WebpageEditor />} />
      </Routes>
    </Router>
  );
}

export default App;

// import BlogGenerator from "./BlogGenerator";

// function App() {
//   return (
//     <div className="App">
//       <h1>AI Blog Generator</h1>
//       <BlogGenerator />
//     </div>
//   );
// }

// export default App;


// import logo from './logo.svg';
// import './App.css';

// function App() {
//   return (
//     <div className="App">
//       <header className="App-header">
//         <img src={logo} className="App-logo" alt="logo" />
//         <p>
//           Edit <code>src/App.js</code> and save to reload.
//         </p>
//         <a
//           className="App-link"
//           href="https://reactjs.org"
//           target="_blank"
//           rel="noopener noreferrer"
//         >
//           Learn React
//         </a>
//       </header>
//     </div>
//   );
// }

// export default App;
