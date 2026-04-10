import { BrowserRouter as Router } from 'react-router-dom';
import TenantPages from './router/TenantPages';
import './App.css';
import './pages/smar/smar.css'; // Global import for tenant-scoped styles

function App() {
  return (
    <Router>
      <div className="App" data-slug="smar">
        <TenantPages />
      </div>
    </Router>
  );
}

export default App;
