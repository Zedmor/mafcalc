import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import manualContent from '../docs/manual.md'; // Adjust the path if necessary

const Manual: React.FC = () => {
  const [content, setContent] = useState('');

  useEffect(() => {
    fetch(manualContent)
      .then((response) => response.text())
      .then((text) => setContent(text));
  }, []);

  return (
    <div className="markdown-content">
      <h1>Manual</h1>
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
};

export default Manual;
