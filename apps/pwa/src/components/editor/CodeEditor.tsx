import React, { useCallback, useMemo } from 'react';
import Editor, { type OnMount, type OnChange } from '@monaco-editor/react';
import { useApp, useFiles } from '../../store/AppContext';
import { FileTab } from './FileTab';

function getMonacoLanguage(lang: string): string {
  const map: Record<string, string> = {
    typescript: 'typescript',
    typescriptreact: 'typescript',
    javascript: 'javascript',
    javascriptreact: 'javascript',
    json: 'json',
    css: 'css',
    scss: 'scss',
    html: 'html',
    markdown: 'markdown',
    python: 'python',
    rust: 'rust',
    go: 'go',
    java: 'java',
    yaml: 'yaml',
    xml: 'xml',
    sql: 'sql',
    shell: 'shell',
    dockerfile: 'dockerfile',
  };
  return map[lang] || 'plaintext';
}

export function CodeEditor() {
  const { state } = useApp();
  const { files, closeFile, setActiveFile, updateFileContent } = useFiles();
  const { openFiles, activeFileId } = files;

  const activeFile = useMemo(
    () => openFiles.find((f) => f.id === activeFileId),
    [openFiles, activeFileId]
  );

  const theme = state.settings.theme === 'light' ? 'vs' : 'vs-dark';

  const handleEditorMount: OnMount = useCallback((editor, _monaco) => {
    editor.focus();
    // Set editor options
    editor.updateOptions({
      minimap: { enabled: false },
      fontSize: state.settings.fontSize,
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      lineHeight: 24,
      padding: { top: 12, bottom: 12 },
      smoothScrolling: true,
      cursorBlinking: 'smooth',
      cursorSmoothCaretAnimation: 'on',
      renderLineHighlight: 'all',
      bracketPairColorization: { enabled: true },
      guides: {
        bracketPairs: true,
        indentation: true,
      },
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      automaticLayout: true,
    });
  }, [state.settings.fontSize]);

  const handleEditorChange: OnChange = useCallback(
    (value) => {
      if (activeFileId && value !== undefined) {
        updateFileContent(activeFileId, value);
      }
    },
    [activeFileId, updateFileContent]
  );

  if (openFiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-surface-0 text-text-muted">
        <div className="text-6xl mb-4 opacity-20">{ }</div>
        <p className="text-lg font-medium mb-2">No file open</p>
        <p className="text-sm">Open a file from the explorer to start editing</p>
        <div className="mt-8 grid grid-cols-2 gap-4 text-xs text-text-muted max-w-sm">
          <div className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 bg-surface-2 rounded text-[10px]">Ctrl+P</kbd>
            <span>Quick Open</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 bg-surface-2 rounded text-[10px]">Ctrl+N</kbd>
            <span>New File</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 bg-surface-2 rounded text-[10px]">Ctrl+`</kbd>
            <span>Terminal</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 bg-surface-2 rounded text-[10px]">Ctrl+B</kbd>
            <span>Sidebar</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-surface-0 editor-container">
      {/* File tabs bar */}
      <div className="flex items-center bg-surface-1 border-b border-border overflow-x-auto no-scrollbar">
        {openFiles.map((file) => (
          <FileTab
            key={file.id}
            file={file}
            isActive={file.id === activeFileId}
            onSelect={() => setActiveFile(file.id)}
            onClose={() => closeFile(file.id)}
          />
        ))}
      </div>

      {/* Monaco Editor */}
      <div className="flex-1 overflow-hidden">
        {activeFile && (
          <Editor
            key={activeFile.id}
            height="100%"
            language={getMonacoLanguage(activeFile.language)}
            value={activeFile.content}
            theme={theme}
            onMount={handleEditorMount}
            onChange={handleEditorChange}
            loading={
              <div className="flex items-center justify-center h-full bg-surface-0">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-text-muted">Loading editor...</span>
                </div>
              </div>
            }
            options={{
              readOnly: false,
              minimap: { enabled: false },
              fontSize: state.settings.fontSize,
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              lineHeight: 24,
              padding: { top: 12, bottom: 12 },
              smoothScrolling: true,
              cursorBlinking: 'smooth',
              cursorSmoothCaretAnimation: 'on',
              renderLineHighlight: 'all',
              bracketPairColorization: { enabled: true },
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              automaticLayout: true,
            }}
          />
        )}
      </div>
    </div>
  );
}
