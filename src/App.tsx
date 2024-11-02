import React from 'react';
import './styles/App.css';
import MafiaCalculatorComponent from './components/MafiaCalculatorComponent';
import { BrowserRouter as Router, Route, Link, Routes } from 'react-router-dom';
import Manual from './components/Manual'; // Import the Manual component

const App: React.FC = () => {
  return (
    <Router>
      <div className="App">
        <nav className="navbar">
          <ul className="nav-links">
            <li>
              <Link to="/">Home</Link>
            </li>
            <li>
              <Link to="/manual.html">Manual</Link>
            </li>
          </ul>
        </nav>

        <Routes>
          <Route path="/" element={<MafiaCalculatorComponent />} />
          <Route path="/manual.html" element={<Manual />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
