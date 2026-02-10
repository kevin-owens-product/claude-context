import { AppShell } from '../components/layout/AppShell';
import { CodeEditor } from '../components/editor/CodeEditor';
import { AiPanel } from '../components/ai/AiPanel';
import { Terminal } from '../components/terminal/Terminal';
import { FileExplorer } from '../components/files/FileExplorer';

interface EditorPageProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function EditorPage({ currentPage, onNavigate }: EditorPageProps) {
  return (
    <AppShell
      currentPage={currentPage}
      onNavigate={onNavigate}
      editorSlot={<CodeEditor />}
      aiPanelSlot={<AiPanel />}
      terminalSlot={<Terminal />}
      fileExplorerSlot={<FileExplorer />}
    />
  );
}
