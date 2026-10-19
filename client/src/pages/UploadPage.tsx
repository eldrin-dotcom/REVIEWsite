import React, { useState, useEffect } from 'react';
import MathRenderer from '../components/math/MathRenderer';
import { useAuth } from '../context/AuthContext';
import {
  UploadCloud,
  FileJson,
  CheckCircle2,
  AlertTriangle,
  FileText,
  FolderTree,
  Download,
  Zap,
  GraduationCap,
  Trash2,
  Eye,
  X,
  ChevronRight,
} from 'lucide-react';
import type { QuestionBankUpload, ExamTypeWithSubjects, Question } from 'shared';

export default function UploadPage() {
  const [fileContent, setFileContent] = useState<QuestionBankUpload | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [parseError, setParseError] = useState<string>('');
  const [importing, setImporting] = useState<boolean>(false);
  const [uploadResult, setUploadResult] = useState<{
    imported: number;
    duplicates: number;
    errors: string[];
    topicName: string;
    subjectName: string;
    examTypeName: string;
  } | null>(null);

  // Hierarchy Tree for browsing uploaded questions
  const { user } = useAuth();
  const [hierarchy, setHierarchy] = useState<ExamTypeWithSubjects[]>([]);
  const [loadingHierarchy, setLoadingHierarchy] = useState<boolean>(true);

  // Question Inspector state for John / users
  const [selectedTopic, setSelectedTopic] = useState<{
    id: number;
    name: string;
    subjectName: string;
    examName: string;
  } | null>(null);
  const [topicQuestions, setTopicQuestions] = useState<Question[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<string>('');

  // Fetch questions for a topic
  const handleViewTopicQuestions = async (topicId: number, topicName: string, subjectName: string, examName: string) => {
    setSelectedTopic({ id: topicId, name: topicName, subjectName, examName });
    setLoadingQuestions(true);
    setActionMessage('');

    try {
      const res = await fetch(`/api/questions/list?topicId=${topicId}`, { credentials: 'include' });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setTopicQuestions(json.data);
        }
      }
    } catch (err) {
      console.error('Failed to load topic questions:', err);
    } finally {
      setLoadingQuestions(false);
    }
  };

  // Delete an individual question (John only)
  const handleDeleteQuestion = async (questionId: number) => {
    if (!confirm('Are you sure you want to delete this question? This cannot be undone.')) {
      return;
    }

    try {
      const res = await fetch(`/api/questions/${questionId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setTopicQuestions(prev => prev.filter(q => q.id !== questionId));
        setActionMessage('✓ Question deleted successfully.');
        await fetchHierarchy();
      } else {
        alert(json.error || 'Failed to delete question');
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('Error deleting question');
    }
  };

  // Delete an entire topic (John only)
  const handleDeleteTopic = async (topicId: number, topicName: string) => {
    if (!confirm(`Are you sure you want to delete the topic "${topicName}" and ALL its questions?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/questions/topic/${topicId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setSelectedTopic(null);
        setTopicQuestions([]);
        setActionMessage(`✓ Topic "${topicName}" deleted.`);
        await fetchHierarchy();
      } else {
        alert(json.error || 'Failed to delete topic');
      }
    } catch (err) {
      console.error('Delete topic error:', err);
      alert('Error deleting topic');
    }
  };

  // Load question counts
  const fetchHierarchy = async () => {
    try {
      const res = await fetch('/api/questions/hierarchy', { credentials: 'include' });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setHierarchy(json.data);
        }
      }
    } catch (err) {
      console.error('Failed to load hierarchy:', err);
    } finally {
      setLoadingHierarchy(false);
    }
  };

  useEffect(() => {
    fetchHierarchy();
  }, []);

  // Handle file select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setParseError('');
    setUploadResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text) as QuestionBankUpload;

        // Basic schema verification
        if (!parsed.examType || !parsed.subject || !parsed.topic || !Array.isArray(parsed.questions)) {
          throw new Error('JSON is missing required fields: examType, subject, topic, or questions array');
        }

        if (parsed.questions.length === 0) {
          throw new Error('questions array is empty');
        }

        setFileContent(parsed);
      } catch (err: unknown) {
        setFileContent(null);
        setParseError(err instanceof Error ? err.message : 'Invalid JSON file');
      }
    };

    reader.readAsText(file);
  };

  // Perform Import
  const handleImport = async () => {
    if (!fileContent) return;

    setImporting(true);
    setParseError('');

    try {
      const res = await fetch('/api/questions/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(fileContent),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to upload question bank');
      }

      setUploadResult(json.data);
      setFileContent(null);
      setFileName('');
      // Refresh hierarchy
      await fetchHierarchy();
    } catch (err: unknown) {
      setParseError(err instanceof Error ? err.message : 'Failed to import questions');
    } finally {
      setImporting(false);
    }
  };

  // Download Sample JSON Template
  const handleDownloadSample = async () => {
    try {
      const res = await fetch('/api/questions/sample', { credentials: 'include' });
      if (res.ok) {
        const json = await res.json();
        const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(json.data, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute('href', dataStr);
        downloadAnchor.setAttribute('download', 'sample_review_questions.json');
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
      }
    } catch (err) {
      console.error('Failed to download template:', err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 mb-2">
            <UploadCloud className="w-3.5 h-3.5" /> Shared Question Pool
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
            Import Question Bank
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Upload AI-scanned JSON files. Imported questions are immediately accessible to both John and Hon!
          </p>
        </div>

        <button
          type="button"
          onClick={handleDownloadSample}
          className="py-2.5 px-4 rounded-xl border border-border bg-bg-secondary hover:bg-card text-text-primary text-xs font-bold transition flex items-center gap-2 whitespace-nowrap shadow-xs"
        >
          <Download className="w-4 h-4 text-primary" /> Download JSON Template
        </button>
      </div>

      {/* Upload Box */}
      <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-xs">
        <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
          Select JSON File
        </label>

        {/* Dropzone / File input */}
        <div className="border-2 border-dashed border-border hover:border-primary rounded-2xl p-8 text-center transition bg-bg-secondary/40 relative">
          <input
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3">
              <FileJson className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-text-primary">
              {fileName ? fileName : 'Click or drag & drop your JSON file here'}
            </p>
            <p className="text-xs text-text-secondary mt-1">
              Supports .json files containing scanned questions, choices, answers, and solutions
            </p>
          </div>
        </div>

        {/* Parse Error */}
        {parseError && (
          <div className="mt-4 p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-bold">Invalid Question Bank Format</p>
              <p className="text-xs mt-0.5">{parseError}</p>
            </div>
          </div>
        )}

        {/* Upload Success Alert with Duplicate Warning */}
        {uploadResult && (
          <div className="mt-6 p-5 rounded-2xl bg-card border border-border space-y-3 shadow-xs">
            <div className="flex items-center gap-2 text-success font-bold text-base">
              <CheckCircle2 className="w-5 h-5" /> Successfully imported to {uploadResult.examTypeName} → {uploadResult.subjectName}!
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              <div className="bg-bg-secondary p-3 rounded-xl border border-border">
                <span className="text-xs text-text-secondary block">New Questions Added</span>
                <span className="text-xl font-bold text-success">{uploadResult.imported}</span>
              </div>
              <div className="bg-bg-secondary p-3 rounded-xl border border-border">
                <span className="text-xs text-text-secondary block">Topic Name</span>
                <span className="text-sm font-semibold text-text-primary truncate block mt-1">
                  {uploadResult.topicName}
                </span>
              </div>
              {uploadResult.duplicates > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl col-span-2 sm:col-span-1">
                  <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Duplicates Skipped
                  </span>
                  <span className="text-xl font-bold text-amber-600 dark:text-amber-400">
                    {uploadResult.duplicates}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Preview of Parsed Content */}
        {fileContent && (
          <div className="mt-6 border-t border-border pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-text-primary text-base">Question Bank Preview</h3>
                <p className="text-xs text-text-secondary">
                  Ready to import into database
                </p>
              </div>

              <span className="px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                {fileContent.questions.length} Items Detected
              </span>
            </div>

            {/* Target info pills */}
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="px-3 py-1 rounded-lg bg-bg-secondary border border-border text-text-primary">
                <strong className="text-text-secondary">Exam:</strong> {fileContent.examType}
              </span>
              <span className="px-3 py-1 rounded-lg bg-bg-secondary border border-border text-text-primary">
                <strong className="text-text-secondary">Subject:</strong> {fileContent.subject}
              </span>
              <span className="px-3 py-1 rounded-lg bg-bg-secondary border border-border text-text-primary">
                <strong className="text-text-secondary">Topic:</strong> {fileContent.topic}
              </span>
            </div>

            {/* Sample Item Preview */}
            <div className="p-4 rounded-xl bg-bg-secondary border border-border text-sm space-y-2">
              <div className="flex items-center justify-between text-xs text-text-secondary font-semibold uppercase tracking-wider">
                <span>Sample Item #1</span>
                <span>Type: {fileContent.questions[0].type}</span>
              </div>
              <div className="font-medium text-text-primary">
                <MathRenderer content={fileContent.questions[0].text} />
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                {fileContent.questions[0].choices.map((c, i) => (
                  <div
                    key={i}
                    className={`p-2 rounded-lg border ${
                      i === fileContent.questions[0].answer
                        ? 'border-success bg-success/10 text-success font-semibold'
                        : 'border-border bg-card text-text-secondary'
                    }`}
                  >
                    ({String.fromCharCode(65 + i)}) <MathRenderer content={c} />
                  </div>
                ))}
              </div>
              {fileContent.questions[0].explanation && (
                <p className="text-xs text-text-secondary pt-1 italic">
                  💡 Explanation: <MathRenderer content={fileContent.questions[0].explanation} />
                </p>
              )}
            </div>

            {/* Confirm Import Button */}
            <button
              type="button"
              disabled={importing}
              onClick={handleImport}
              className="w-full py-3.5 px-6 rounded-xl font-bold text-white bg-primary hover:bg-primary-hover transition shadow-md flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              {importing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Importing Questions to Shared Database...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>Confirm and Import {fileContent.questions.length} Questions</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Available Question Bank Tree */}
      <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-text-primary">Current Question Inventory</h2>
            <p className="text-xs text-text-secondary">All questions currently available in the system</p>
          </div>
          <FolderTree className="w-5 h-5 text-text-secondary" />
        </div>

        {loadingHierarchy ? (
          <div className="text-center py-8 text-text-secondary text-sm">Loading question tree...</div>
        ) : (
          <div className="space-y-4">
            {hierarchy.map((et) => (
              <div key={et.id} className="border border-border rounded-xl p-4 bg-bg-secondary/40">
                <div className="font-bold text-sm text-text-primary flex items-center gap-2 mb-3">
                  {et.name === 'ECT' ? <Zap className="w-4 h-4 text-amber-500" /> : <GraduationCap className="w-4 h-4 text-primary" />}
                  <span>{et.name}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {et.subjects.map((sub) => (
                    <div key={sub.id} className="bg-card border border-border rounded-xl p-3 text-xs">
                      <div className="font-bold text-text-primary flex items-center justify-between mb-2">
                        <span>{sub.name}</span>
                        <span className="text-[11px] text-text-secondary font-semibold">
                          {sub.topics.reduce((acc, t) => acc + t.questionCount, 0)} total
                        </span>
                      </div>

                      {sub.topics.length > 0 ? (
                        <div className="space-y-1">
                          {sub.topics.map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => handleViewTopicQuestions(t.id, t.name, sub.name, et.name)}
                              className={`w-full flex items-center justify-between p-1.5 rounded-lg transition text-left text-xs ${
                                selectedTopic?.id === t.id
                                  ? 'bg-primary/10 text-primary font-bold shadow-xs'
                                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary'
                              }`}
                            >
                              <span className="truncate pr-2">{t.name}</span>
                              <span className="font-semibold text-text-primary shrink-0 flex items-center gap-1">
                                {t.questionCount}
                                <ChevronRight className="w-3 h-3 opacity-60" />
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <span className="text-text-secondary italic">No topics uploaded yet</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selected Topic Question Inspector & Management */}
      {selectedTopic && (
        <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-xs space-y-5 animate-fade-in">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  {selectedTopic.examName} → {selectedTopic.subjectName}
                </span>
                {user?.username === 'john' && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    Admin: John (Deletion Enabled)
                  </span>
                )}
              </div>
              <h3 className="text-xl font-bold text-text-primary">
                {selectedTopic.name}
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                {topicQuestions.length} questions loaded in this topic
              </p>
            </div>

            <div className="flex items-center gap-2">
              {user?.username === 'john' && (
                <button
                  type="button"
                  onClick={() => handleDeleteTopic(selectedTopic.id, selectedTopic.name)}
                  className="py-1.5 px-3 rounded-lg text-xs font-semibold text-danger bg-danger/10 hover:bg-danger hover:text-white border border-danger/20 transition flex items-center gap-1.5"
                  title="Delete topic and all its questions"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete Topic
                </button>
              )}

              <button
                type="button"
                onClick={() => setSelectedTopic(null)}
                className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-secondary border border-border transition"
                title="Close question inspector"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Action Notification */}
          {actionMessage && (
            <div className="p-3 rounded-xl bg-success/10 border border-success/30 text-success text-xs font-semibold">
              {actionMessage}
            </div>
          )}

          {/* Question List */}
          {loadingQuestions ? (
            <div className="text-center py-8 text-text-secondary text-sm">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Loading questions...
            </div>
          ) : topicQuestions.length > 0 ? (
            <div className="space-y-4">
              {topicQuestions.map((q, qIndex) => (
                <div
                  key={q.id}
                  className="p-4 rounded-xl border border-border bg-bg-secondary/40 space-y-3"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-text-secondary">
                      Question #{qIndex + 1}
                    </span>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          q.type === 'computation'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                            : 'bg-primary/10 text-primary border border-primary/20'
                        }`}
                      >
                        {q.type === 'computation' ? 'Computation' : 'Conceptual'}
                      </span>

                      {/* John's Delete Question Button */}
                      {user?.username === 'john' && (
                        <button
                          type="button"
                          onClick={() => handleDeleteQuestion(q.id)}
                          className="py-1 px-2.5 rounded-lg text-xs font-semibold text-danger bg-danger/10 hover:bg-danger hover:text-white border border-danger/20 transition flex items-center gap-1"
                          title="Delete this question"
                        >
                          <Trash2 className="w-3 h-3" /> Delete
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Question Text */}
                  <div className="text-sm font-medium text-text-primary leading-relaxed">
                    <MathRenderer content={q.text} />
                  </div>

                  {/* Choices */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {q.choices.map((choice, cIdx) => (
                      <div
                        key={cIdx}
                        className={`p-2.5 rounded-lg border flex items-start gap-2 ${
                          cIdx === q.correctAnswer
                            ? 'border-success bg-success/15 text-success font-semibold shadow-xs'
                            : 'border-border bg-card text-text-secondary'
                        }`}
                      >
                        <span className="font-bold">({String.fromCharCode(65 + cIdx)})</span>
                        <span className="flex-1">
                          <MathRenderer content={choice} />
                        </span>
                        {cIdx === q.correctAnswer && (
                          <span className="text-[10px] text-success font-bold uppercase">Correct</span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Explanation */}
                  {q.explanation && (
                    <div className="text-xs text-text-secondary bg-card p-3 rounded-lg border border-border">
                      <strong className="text-text-primary block mb-0.5">Solution / Explanation:</strong>
                      <MathRenderer content={q.explanation} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-text-secondary text-sm">
              No questions found in this topic.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

