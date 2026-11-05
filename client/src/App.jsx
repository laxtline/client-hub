// App — wires together the global providers (auth + sockets + toasts), the error
// boundary, the router, and the route table. Kept thin: all real UI lives in
// pages/components.
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { SocketProvider } from './context/SocketContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import ErrorBoundary from './components/common/ErrorBoundary.jsx';
import Toaster from './components/common/Toaster.jsx';
import AppRoutes from './routes/AppRoutes.jsx';

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <BrowserRouter>
          {/* AuthProvider must wrap SocketProvider — the socket connects using the token. */}
          <AuthProvider>
            <SocketProvider>
              <ToastProvider>
                <AppRoutes />
                <Toaster />
              </ToastProvider>
            </SocketProvider>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
