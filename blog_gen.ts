import { useState } from 'react';

function BlogGenerator() {
  const [topic, setTopic] = useState('');
  const [section, setSection] = useState('ALL');
  const [additionalPrompt, setAdditionalPrompt] = useState('');
  const [content, setContent] = useState({ title: '', intro: '', body: '' });

  const handleGenerate = async () => {
    const response = await fetch('http://localhost:5000/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, section, additionalPrompt }),
    });
    const data = await response.json();
    setContent(data);
  };

  return (
    <div>
      <h2>Blog Generator</h2>
      <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Enter blog topic" />
      <select value={section} onChange={(e) => setSection(e.target.value)}>
        <option value="ALL">All</option>
        <option value="TITLE">Title</option>
        <option value="INTRODUCTION">Introduction</option>
        <option value="BODY">Body</option>
      </select>
      <textarea value={additionalPrompt} onChange={(e) => setAdditionalPrompt(e.target.value)} placeholder="Additional prompt" />
      <button onClick={handleGenerate}>Generate</button>
      <h3>Generated Content</h3>
      <p><strong>Title:</strong> {content.title}</p>
      <p><strong>Introduction:</strong> {content.intro}</p>
      <p><strong>Body:</strong> {content.body}</p>
    </div>
  );
}

export default BlogGenerator;
