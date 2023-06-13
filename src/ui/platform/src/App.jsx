import { Suspense } from 'react';
import './App.sass';
import Routes from './routes';

function App() {
  return (
    <div className="App">
      <Suspense fallback={<div className="container">Loading...</div>}></Suspense>
      <Routes />
    </div>
  );
}

export default App;
