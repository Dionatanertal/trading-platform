import { Component, StrictMode, type ErrorInfo, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
    state = { failed: false };
    static getDerivedStateFromError() { return { failed: true }; }
    componentDidCatch(_error: Error, _info: ErrorInfo) {
        console.error('P02: falha de renderização do terminal demonstrativo.');
    }
    render() {
        if (this.state.failed) return <main className="fatal" role="alert">
            <h1>Não foi possível exibir o terminal.</h1>
            <p>Recarregar encerra esta sessão simulada e limpa suas operações.</p>
            <button onClick={() => window.location.reload()}>Recarregar simulação</button>
        </main>;
        return this.props.children;
    }
}

createRoot(document.getElementById('root')!).render(
    <StrictMode><ErrorBoundary><App /></ErrorBoundary></StrictMode>,
);
