import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// If visiting admin.cizah.com, rewrite the path to /admin/* so React Router
// picks up the correct routes before the app renders.
if (
  window.location.hostname === 'admin.cizah.com' &&
  !window.location.pathname.startsWith('/admin')
) {
  const newPath = '/admin' + (window.location.pathname === '/' ? '' : window.location.pathname);
  window.history.replaceState(null, '', newPath + window.location.search + window.location.hash);
}

createRoot(document.getElementById("root")!).render(<App />);
