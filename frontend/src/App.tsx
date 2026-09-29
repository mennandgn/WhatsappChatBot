import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Chat from './pages/Chat';
import Admin from './pages/Admin';
import FlowBuilder from './pages/FlowBuilder';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/flow-builder" element={<FlowBuilder />} />
      </Routes>
    </Router>
  );
}

export default App;
